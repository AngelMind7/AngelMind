import { and, eq } from "drizzle-orm";
import { jobs } from "../drizzle/schema";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";
import { advanceExecution, canonicalExecutionPath, transitionExecution, type ExecutionContext, type ExecutionState, type ExecutionRisk } from "./execution-state-machine";
import { enqueueJob } from "./ai-platform";
import { publishExecutionProgress } from "./execution-progress-events";

export type ExecutionLedgerInput = {
  workspaceId: number;
  capability: string;
  toolKey: string;
  risk: ExecutionRisk;
  scopeValidated: boolean;
  approval: ExecutionContext["approval"];
  requestId: string;
};

type LedgerPayload = ExecutionLedgerInput & {
  state: ExecutionState;
  revision: number;
  path: readonly ExecutionState[];
  assuranceReport?: Record<string, unknown>;
  terminalReason?: string;
  traceId?: string | null;
};

function readPayload(payload: string): LedgerPayload {
  const parsed = JSON.parse(payload) as Partial<LedgerPayload>;
  if (!parsed || typeof parsed !== "object" || !parsed.state || typeof parsed.revision !== "number") throw new Error("Execution ledger payload is invalid.");
  return parsed as LedgerPayload;
}

async function publishProgress(payload: LedgerPayload, jobId: number) {
  try {
    await publishExecutionProgress({
      workspaceId: payload.workspaceId,
      jobId,
      requestId: payload.requestId,
      capability: payload.capability,
      toolKey: payload.toolKey,
      state: payload.state,
      revision: payload.revision,
      terminalReason: payload.terminalReason,
      traceId: payload.traceId ?? null,
    });
  } catch (error) {
    console.error("[ExecutionLedger] realtime progress publish failed", error);
  }
}

export async function createExecutionLedger(userId: number, input: ExecutionLedgerInput) {
  if (!(await canAccessWorkspace(userId, input.workspaceId, "respond"))) throw new Error("Workspace tidak ditemukan atau tidak dapat diakses.");
  if (!input.requestId.trim() || input.requestId.length > 128) throw new Error("Execution request id is invalid.");
  const result = await enqueueJob(userId, {
    workspaceId: input.workspaceId,
    kind: "governed.execution",
    idempotencyKey: `execution:${input.requestId}`,
    payload: { ...input, state: "INIT", revision: 0, path: canonicalExecutionPath() },
    maxAttempts: 3,
  });
  const payload = readPayload(result.payload);
  await publishProgress(payload, result.id);
  return { jobId: result.id, payload, status: result.status };
}

export async function getExecutionLedger(userId: number, jobId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.kind, "governed.execution"))).limit(1);
  if (!job || !job.workspaceId || !(await canAccessWorkspace(userId, job.workspaceId, "read"))) throw new Error("Execution ledger tidak ditemukan atau tidak dapat diakses.");
  return { ...job, payload: readPayload(job.payload) };
}

export async function getExecutionProgress(userId: number, jobId: number) {
  const execution = await getExecutionLedger(userId, jobId);
  const payload = execution.payload;
  const pathIndex = payload.path.findIndex(state => state === payload.state);
  const report = payload.assuranceReport;
  const reportId = report && typeof report.reportId === "string" ? report.reportId : null;
  return {
    jobId: execution.id,
    workspaceId: execution.workspaceId as number,
    requestId: payload.requestId,
    capability: payload.capability,
    toolKey: payload.toolKey,
    risk: payload.risk,
    state: payload.state,
    revision: payload.revision,
    pathIndex: pathIndex < 0 ? null : pathIndex,
    pathLength: payload.path.length,
    status: execution.status,
    terminalReason: payload.terminalReason ?? null,
    reportId,
    updatedAt: execution.updatedAt,
    completedAt: execution.completedAt,
  } as const;
}

export async function advanceExecutionLedger(userId: number, jobId: number) {
  const current = await getExecutionLedger(userId, jobId);
  const payload = current.payload;
  const result = transitionExecution({ state: payload.state, risk: payload.risk, scopeValidated: payload.scopeValidated, approval: payload.approval });
  if (!result.allowed) throw new Error(result.reason);
  const nextPayload: LedgerPayload = { ...payload, state: result.to, revision: payload.revision + 1 };
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const updated = await db.update(jobs).set({ payload: JSON.stringify(nextPayload), updatedAt: new Date() }).where(and(eq(jobs.id, jobId), eq(jobs.status, current.status)));
  if (updated[0].affectedRows !== 1) throw new Error("Execution ledger changed concurrently; retry with a fresh state.");
  await publishProgress(nextPayload, jobId);
  return { from: payload.state, to: nextPayload.state, revision: nextPayload.revision };
}

export async function persistExecutionReport(userId: number, jobId: number, report: Record<string, unknown>) {
  const current = await getExecutionLedger(userId, jobId);
  if (current.payload.state !== "REPORT_GENERATION") throw new Error("Execution report can only be persisted at REPORT_GENERATION.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const nextPayload: LedgerPayload = { ...current.payload, assuranceReport: report, revision: current.payload.revision + 1, terminalReason: "report_generated_review_required" };
  const updated = await db.update(jobs).set({ payload: JSON.stringify(nextPayload), status: "succeeded", lockedAt: null, leaseExpiresAt: null, heartbeatAt: null, workerId: null, completedAt: new Date(), updatedAt: new Date() }).where(and(eq(jobs.id, jobId), eq(jobs.status, current.status)));
  if (updated[0].affectedRows !== 1) throw new Error("Execution ledger changed concurrently; report persistence was not committed.");
  await publishProgress(nextPayload, jobId);
  return { jobId, state: nextPayload.state, revision: nextPayload.revision, status: "succeeded" as const };
}

export async function completeExecutionLedger(userId: number, jobId: number, reason: string) {
  const current = await getExecutionLedger(userId, jobId);
  if (current.payload.state === "DONE") return { jobId, state: current.payload.state, status: current.status };
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const nextPayload: LedgerPayload = { ...current.payload, revision: current.payload.revision + 1, terminalReason: reason.trim().slice(0, 500) || "execution_completed" };
  const updated = await db.update(jobs).set({ payload: JSON.stringify(nextPayload), status: "succeeded", lockedAt: null, leaseExpiresAt: null, heartbeatAt: null, workerId: null, completedAt: new Date(), updatedAt: new Date() }).where(and(eq(jobs.id, jobId), eq(jobs.status, current.status)));
  if (updated[0].affectedRows !== 1) throw new Error("Execution ledger changed concurrently; completion was not committed.");
  await publishProgress(nextPayload, jobId);
  return { jobId, state: nextPayload.state, revision: nextPayload.revision, status: "succeeded" as const };
}

export async function failExecutionLedger(userId: number, jobId: number, reason: string) {
  const current = await getExecutionLedger(userId, jobId);
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const nextPayload: LedgerPayload = { ...current.payload, revision: current.payload.revision + 1, terminalReason: reason.trim().slice(0, 500) || "execution_failed" };
  const updated = await db.update(jobs).set({ payload: JSON.stringify(nextPayload), status: "dead_letter", lockedAt: null, leaseExpiresAt: null, heartbeatAt: null, workerId: null, completedAt: new Date(), updatedAt: new Date(), lastError: nextPayload.terminalReason }).where(and(eq(jobs.id, jobId), eq(jobs.status, current.status)));
  if (updated[0].affectedRows !== 1) throw new Error("Execution ledger changed concurrently; failure was not committed.");
  await publishProgress(nextPayload, jobId);
  return { jobId, state: nextPayload.state, revision: nextPayload.revision, status: "dead_letter" as const };
}