import { and, eq } from "drizzle-orm";
import { jobs } from "../drizzle/schema";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";
import { advanceExecution, canonicalExecutionPath, type ExecutionContext, type ExecutionState, type ExecutionRisk } from "./execution-state-machine";
import { enqueueJob } from "./ai-platform";

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
};

function readPayload(payload: string): LedgerPayload {
  const parsed = JSON.parse(payload) as Partial<LedgerPayload>;
  if (!parsed || typeof parsed !== "object" || !parsed.state || typeof parsed.revision !== "number") throw new Error("Execution ledger payload is invalid.");
  return parsed as LedgerPayload;
}

export async function createExecutionLedger(userId: number, input: ExecutionLedgerInput) {
  if (!(await canAccessWorkspace(userId, input.workspaceId, "respond"))) throw new Error("Workspace tidak ditemukan atau tidak dapat diakses.");
  if (!input.requestId.trim() || input.requestId.length > 128) throw new Error("Execution request id is invalid.");
  const result = await enqueueJob(userId, {
    workspaceId: input.workspaceId,
    kind: "governed.execution",
    idempotencyKey: `execution:${input.requestId}`,
    payload: {
      ...input,
      state: "INIT",
      revision: 0,
      path: canonicalExecutionPath(),
    },
    maxAttempts: 3,
  });
  return { jobId: result.id, payload: readPayload(result.payload), status: result.status };
}

export async function getExecutionLedger(userId: number, jobId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.kind, "governed.execution"))).limit(1);
  if (!job || !job.workspaceId || !(await canAccessWorkspace(userId, job.workspaceId, "read"))) throw new Error("Execution ledger tidak ditemukan atau tidak dapat diakses.");
  return { ...job, payload: readPayload(job.payload) };
}

export async function advanceExecutionLedger(userId: number, jobId: number) {
  const current = await getExecutionLedger(userId, jobId);
  const payload = current.payload;
  const result = advanceExecution({
    state: payload.state,
    risk: payload.risk,
    scopeValidated: payload.scopeValidated,
    approval: payload.approval,
  });
  if (result.state === payload.state) throw new Error(result.reason ?? "Execution state cannot advance.");
  const nextPayload: LedgerPayload = { ...payload, state: result.state, revision: payload.revision + 1 };
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const updated = await db.update(jobs).set({ payload: JSON.stringify(nextPayload), updatedAt: new Date() }).where(and(eq(jobs.id, jobId), eq(jobs.status, current.status)));
  if (updated[0].affectedRows !== 1) throw new Error("Execution ledger changed concurrently; retry with a fresh state.");
  return { from: payload.state, to: result.state, revision: nextPayload.revision };
}

export async function persistExecutionReport(userId: number, jobId: number, report: Record<string, unknown>) {
  const current = await getExecutionLedger(userId, jobId);
  if (current.payload.state !== "REPORT_GENERATION") throw new Error("Execution report can only be persisted at REPORT_GENERATION.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const nextPayload: LedgerPayload = {
    ...current.payload,
    assuranceReport: report,
    revision: current.payload.revision + 1,
  };
  const updated = await db.update(jobs)
    .set({ payload: JSON.stringify(nextPayload), status: "succeeded", lockedAt: null, leaseExpiresAt: null, heartbeatAt: null, workerId: null, completedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(jobs.id, jobId), eq(jobs.status, current.status)));
  if (updated[0].affectedRows !== 1) throw new Error("Execution ledger changed concurrently; report persistence was not committed.");
  return { jobId, state: nextPayload.state, revision: nextPayload.revision, status: "succeeded" as const };
}
