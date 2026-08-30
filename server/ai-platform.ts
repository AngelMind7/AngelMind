import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, lte, lt, or, sql } from "drizzle-orm";
import { aiModels, aiRunEvaluations, aiRunOutputs, aiRuns, jobs, outboxEvents, workspaces } from "../drizzle/schema";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";
import { planMultiAgentRun } from "./ai-orchestration";
import { invokeLLM, type Message } from "./_core/llm";

async function requireWorkspace(userId: number, workspaceId: number, intent: "read" | "respond" = "read") {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  if (!(await canAccessWorkspace(userId, workspaceId, intent))) throw new Error("Workspace tidak ditemukan atau tidak dapat diakses.");
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  if (!workspace) throw new Error("Workspace tidak ditemukan.");
  return { db, workspace };
}

export async function listModels() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiModels).where(eq(aiModels.status, "active")).orderBy(asc(aiModels.provider), asc(aiModels.modelKey));
}

export async function registerModel(userId: number, input: { modelKey: string; provider: string; gateway: string; capabilities: string[]; contextWindow: number; version?: string; inputCostPerMillionCents?: number; outputCostPerMillionCents?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const modelKey = input.modelKey.trim();
  if (modelKey.length < 2) throw new Error("Model key is required.");
  await db.insert(aiModels).values({ modelKey, provider: input.provider.trim(), gateway: input.gateway.trim(), capabilities: JSON.stringify(input.capabilities), contextWindow: input.contextWindow, status: "active", version: input.version?.trim() || null, inputCostPerMillionCents: input.inputCostPerMillionCents ?? 0, outputCostPerMillionCents: input.outputCostPerMillionCents ?? 0 }).onDuplicateKeyUpdate({ set: { provider: input.provider.trim(), gateway: input.gateway.trim(), capabilities: JSON.stringify(input.capabilities), contextWindow: input.contextWindow, version: input.version?.trim() || null, inputCostPerMillionCents: input.inputCostPerMillionCents ?? 0, outputCostPerMillionCents: input.outputCostPerMillionCents ?? 0, status: "active", updatedAt: new Date() } });
  const [model] = await db.select().from(aiModels).where(eq(aiModels.modelKey, modelKey)).limit(1);
  return model;
}

export async function recordModelHealth(userId: number, input: { modelKey: string; status: "active" | "degraded" | "disabled"; latencyMs?: number; errorCode?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [model] = await db.select().from(aiModels).where(eq(aiModels.modelKey, input.modelKey.trim())).limit(1);
  if (!model) throw new Error("AI model tidak ditemukan.");
  await db.update(aiModels).set({ status: input.status, lastHealthCheckAt: new Date(), lastLatencyMs: input.latencyMs ?? null, lastErrorCode: input.errorCode?.trim() || null, updatedAt: new Date() }).where(eq(aiModels.id, model.id));
  const [updated] = await db.select().from(aiModels).where(eq(aiModels.id, model.id)).limit(1);
  return updated;
}

export async function startAiRun(userId: number, input: { workspaceId: number; sessionId?: number; taskId?: number; modelKey: string; gateway: string; purpose: string; inputReference: string; estimatedCostCents?: number; retentionDays?: number }) {
  const { db, workspace } = await requireWorkspace(userId, input.workspaceId, "respond");
  const estimatedCostCents = Math.max(0, input.estimatedCostCents ?? 0);
  if (workspace.budgetCents > 0 && workspace.spentCents + estimatedCostCents > workspace.budgetCents) throw new Error("AI run blocked by workspace budget ceiling.");
  const traceId = randomUUID();
  const retentionDays = Math.min(3_650, Math.max(1, input.retentionDays ?? 90));
  const retentionUntil = new Date(Date.now() + retentionDays * 86_400_000);
  await db.insert(aiRuns).values({ workspaceId: workspace.id, sessionId: input.sessionId ?? null, taskId: input.taskId ?? null, userId, modelKey: input.modelKey.trim(), gateway: input.gateway.trim(), purpose: input.purpose.trim(), traceId, inputReference: input.inputReference.trim(), status: "queued", costCents: estimatedCostCents, retentionUntil });
  const [run] = await db.select().from(aiRuns).where(eq(aiRuns.traceId, traceId)).limit(1);
  if (!run) throw new Error("AI run could not be created.");
  return run;
}

export async function updateAiRun(userId: number, input: { runId: number; status: "running" | "completed" | "failed" | "partial" | "cancelled"; outputReference?: string; inputTokens?: number; outputTokens?: number; costCents?: number; errorCode?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [run] = await db.select().from(aiRuns).where(eq(aiRuns.id, input.runId)).limit(1);
  if (!run || !(await canAccessWorkspace(userId, run.workspaceId, "respond"))) throw new Error("AI run tidak ditemukan atau tidak dapat diakses.");
  const costCents = Math.max(0, input.costCents ?? run.costCents);
  const terminalBeforeUpdate = run.status === "completed" || run.status === "partial";
  if (terminalBeforeUpdate && ["completed", "partial"].includes(input.status)) throw new Error("AI run is already terminal and cannot be billed again.");
  await db.update(aiRuns).set({ status: input.status, outputReference: input.outputReference?.trim() || run.outputReference, inputTokens: input.inputTokens ?? run.inputTokens, outputTokens: input.outputTokens ?? run.outputTokens, costCents, errorCode: input.errorCode?.trim() || null, startedAt: run.startedAt ?? new Date(), completedAt: ["completed", "failed", "partial", "cancelled"].includes(input.status) ? new Date() : null }).where(eq(aiRuns.id, run.id));
  if ((input.status === "completed" || input.status === "partial") && !terminalBeforeUpdate) await db.update(workspaces).set({ spentCents: sql`${workspaces.spentCents} + ${costCents}` }).where(eq(workspaces.id, run.workspaceId));
  const [updated] = await db.select().from(aiRuns).where(eq(aiRuns.id, run.id)).limit(1);
  return updated;
}

export async function evaluateAiRun(userId: number, input: { runId: number; rubric: string; score: number; verdict: "pass" | "fail" | "needs_review"; notes: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [run] = await db.select().from(aiRuns).where(eq(aiRuns.id, input.runId)).limit(1);
  if (!run || !(await canAccessWorkspace(userId, run.workspaceId, "review"))) throw new Error("AI run tidak ditemukan atau tidak dapat direview.");
  const rubric = input.rubric.trim();
  const notes = input.notes.trim();
  if (rubric.length < 2 || notes.length < 2 || input.score < 0 || input.score > 100) throw new Error("Evaluation rubric, notes, dan score harus valid.");
  await db.insert(aiRunEvaluations).values({ workspaceId: run.workspaceId, runId: run.id, rubric, score: input.score, verdict: input.verdict, notes, evaluatedByUserId: userId }).onDuplicateKeyUpdate({ set: { score: input.score, verdict: input.verdict, notes, evaluatedByUserId: userId, createdAt: new Date() } });
  const [evaluation] = await db.select().from(aiRunEvaluations).where(and(eq(aiRunEvaluations.runId, run.id), eq(aiRunEvaluations.rubric, rubric))).limit(1);
  return evaluation;
}

export async function listAiRunEvaluations(userId: number, runId: number) {
  const db = await getDb();
  if (!db) return [];
  const [run] = await db.select().from(aiRuns).where(eq(aiRuns.id, runId)).limit(1);
  if (!run || !(await canAccessWorkspace(userId, run.workspaceId, "read"))) throw new Error("AI run tidak ditemukan atau tidak dapat diakses.");
  return db.select().from(aiRunEvaluations).where(eq(aiRunEvaluations.runId, runId)).orderBy(desc(aiRunEvaluations.createdAt));
}

export async function listAiRuns(userId: number, workspaceId: number) {
  const { db } = await requireWorkspace(userId, workspaceId);
  return db.select().from(aiRuns).where(eq(aiRuns.workspaceId, workspaceId)).orderBy(desc(aiRuns.createdAt)).limit(100);
}

export async function enqueueJob(userId: number, input: { workspaceId?: number; kind: string; idempotencyKey: string; payload: Record<string, unknown>; maxAttempts?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  if (input.workspaceId) await requireWorkspace(userId, input.workspaceId, "respond");
  const idempotencyKey = input.idempotencyKey.trim();
  if (idempotencyKey.length < 8) throw new Error("Idempotency key must be at least 8 characters.");
  const [existing] = await db.select().from(jobs).where(eq(jobs.idempotencyKey, idempotencyKey)).limit(1);
  if (existing) return existing;
  await db.insert(jobs).values({ workspaceId: input.workspaceId ?? null, kind: input.kind.trim(), idempotencyKey, payload: JSON.stringify(input.payload), status: "queued", attempts: 0, maxAttempts: input.maxAttempts ?? 3, availableAt: new Date() });
  const [job] = await db.select().from(jobs).where(eq(jobs.idempotencyKey, idempotencyKey)).limit(1);
  return job;
}

export async function listJobs(userId: number, workspaceId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (workspaceId) await requireWorkspace(userId, workspaceId);
  const rows = workspaceId ? await db.select().from(jobs).where(eq(jobs.workspaceId, workspaceId)).orderBy(desc(jobs.createdAt)).limit(100) : await db.select().from(jobs).where(eq(jobs.status, "queued")).orderBy(asc(jobs.availableAt)).limit(100);
  return rows;
}

export async function publishOutboxEvent(userId: number, input: { workspaceId?: number; eventType: string; aggregateType: string; aggregateId: number; idempotencyKey: string; schemaVersion?: number; payload: Record<string, unknown> }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  if (input.workspaceId) await requireWorkspace(userId, input.workspaceId, "respond");
  const existing = await db.select().from(outboxEvents).where(eq(outboxEvents.idempotencyKey, input.idempotencyKey)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(outboxEvents).values({ workspaceId: input.workspaceId ?? null, eventType: input.eventType.trim(), aggregateType: input.aggregateType.trim(), aggregateId: input.aggregateId, idempotencyKey: input.idempotencyKey.trim(), schemaVersion: input.schemaVersion ?? 1, payload: JSON.stringify(input.payload), status: "pending", attempts: 0 });
  const [event] = await db.select().from(outboxEvents).where(eq(outboxEvents.idempotencyKey, input.idempotencyKey)).limit(1);
  return event;
}

export async function markOutboxEventPublished(eventId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.update(outboxEvents).set({ status: "published", publishedAt: new Date() }).where(and(eq(outboxEvents.id, eventId), eq(outboxEvents.status, "pending")));
  return { success: true as const, eventId, status: "published" as const };
}

export async function failOutboxEvent(eventId: number, errorMessage: string) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [event] = await db.select().from(outboxEvents).where(eq(outboxEvents.id, eventId)).limit(1);
  if (!event) throw new Error("Outbox event tidak ditemukan.");
  if (event.attempts >= 5) return { success: false as const, eventId, status: "failed" as const, attempts: event.attempts };
  await db.update(outboxEvents).set({ status: "failed", attempts: event.attempts + 1 }).where(and(eq(outboxEvents.id, eventId), eq(outboxEvents.status, "pending")));
  return { success: false as const, eventId, status: "failed" as const, attempts: event.attempts + 1, error: errorMessage.trim().slice(0, 4_000) };
}

export async function claimPendingJobs(limit = 25) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 10 * 60 * 1_000);
  await db.update(jobs).set({ status: "retrying", lockedAt: null, availableAt: now, lastError: "Worker lease expired.", updatedAt: now }).where(and(eq(jobs.status, "running"), lt(jobs.lockedAt, staleBefore)));
  const available = await db.select().from(jobs).where(and(or(eq(jobs.status, "queued"), eq(jobs.status, "retrying")), lte(jobs.availableAt, now))).orderBy(asc(jobs.availableAt)).limit(Math.min(100, Math.max(1, limit)));
  const claimed = [];
  for (const job of available) {
    await db.update(jobs).set({ status: "running", attempts: job.attempts + 1, lockedAt: now, updatedAt: now }).where(and(eq(jobs.id, job.id), or(eq(jobs.status, "queued"), eq(jobs.status, "retrying"))));
    claimed.push({ ...job, status: "running" as const, attempts: job.attempts + 1, lockedAt: now });
  }
  return claimed;
}

export async function completeJob(jobId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.update(jobs).set({ status: "succeeded", lockedAt: null, completedAt: new Date(), updatedAt: new Date() }).where(and(eq(jobs.id, jobId), eq(jobs.status, "running")));
  return { success: true as const, jobId, status: "succeeded" as const };
}

export async function failJob(jobId: number, errorMessage: string) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) throw new Error("Job tidak ditemukan.");
  const lastError = errorMessage.trim().slice(0, 4_000) || "Worker failed.";
  const terminal = job.attempts >= job.maxAttempts;
  const nextStatus = terminal ? "dead_letter" : "retrying";
  const backoffMs = Math.min(60 * 60 * 1_000, 2 ** Math.max(0, job.attempts - 1) * 5_000);
  await db.update(jobs).set({ status: nextStatus, lockedAt: null, lastError, availableAt: terminal ? job.availableAt : new Date(Date.now() + backoffMs), completedAt: terminal ? new Date() : null, updatedAt: new Date() }).where(and(eq(jobs.id, jobId), eq(jobs.status, "running")));
  return { success: true as const, jobId, status: nextStatus };
}


export async function enqueueOrchestrationPlan(userId: number, input: { workspaceId: number; objective: string; roles: ("scope" | "evidence" | "risk" | "report")[]; evidenceReferences?: string[]; idempotencyKey: string }) {
  const plan = planMultiAgentRun(input);
  const job = await enqueueJob(userId, {
    workspaceId: input.workspaceId,
    kind: "orchestration.plan",
    idempotencyKey: input.idempotencyKey,
    payload: {
      type: "orchestration_plan",
      planId: input.idempotencyKey,
      workspaceId: input.workspaceId,
      plan,
    },
  });
  return { job, plan };
}


export async function startDurableAiRun(userId: number, input: { workspaceId: number; sessionId?: number; taskId?: number; modelKey: string; gateway: string; purpose: string; inputReference: string; messages: Message[]; estimatedCostCents?: number; retentionDays?: number; idempotencyKey: string }) {
  const run = await startAiRun(userId, input);
  const job = await enqueueJob(userId, {
    workspaceId: input.workspaceId,
    kind: "ai.run.execute",
    idempotencyKey: input.idempotencyKey,
    payload: {
      type: "ai_run_execute",
      runId: run.id,
      userId,
      workspaceId: input.workspaceId,
      modelKey: input.modelKey.trim(),
      gateway: input.gateway.trim(),
      messages: input.messages,
    },
  });
  return { run, job };
}

export async function executeAiRunJob(payload: Record<string, unknown>) {
  const runId = Number(payload.runId);
  const userId = Number(payload.userId);
  const workspaceId = Number(payload.workspaceId);
  const modelKey = String(payload.modelKey ?? "").trim();
  const gateway = String(payload.gateway ?? "").trim();
  const messages = payload.messages as Message[];
  if (!Number.isInteger(runId) || !Number.isInteger(userId) || !Number.isInteger(workspaceId) || !modelKey || !gateway || !Array.isArray(messages) || messages.length === 0) throw new Error("Invalid AI run job payload.");
  await updateAiRun(userId, { runId, status: "running" });
  try {
    const response = await invokeLLM({ model: modelKey, messages });
    const db = await getDb();
    if (!db) throw new Error("Database tidak tersedia.");
    await db.insert(aiRunOutputs).values({ workspaceId, runId, outputJson: JSON.stringify(response) }).onDuplicateKeyUpdate({ set: { outputJson: JSON.stringify(response), createdAt: new Date() } });
    const outputReference = `ai-run-output:${runId}`;
    await updateAiRun(userId, { runId, status: "completed", outputReference, inputTokens: response.usage?.prompt_tokens ?? 0, outputTokens: response.usage?.completion_tokens ?? 0 });
  } catch (error) {
    await updateAiRun(userId, { runId, status: "failed", errorCode: error instanceof Error ? error.message.slice(0, 120) : "AI_RUN_FAILED" });
    throw error;
  }
}

export async function getAiRunOutput(userId: number, runId: number) {
  const db = await getDb();
  if (!db) return null;
  const [run] = await db.select().from(aiRuns).where(eq(aiRuns.id, runId)).limit(1);
  if (!run || !(await canAccessWorkspace(userId, run.workspaceId, "read"))) throw new Error("AI run tidak ditemukan atau tidak dapat diakses.");
  const [output] = await db.select().from(aiRunOutputs).where(eq(aiRunOutputs.runId, runId)).limit(1);
  return output ? { ...output, output: JSON.parse(output.outputJson) as unknown } : null;
}
