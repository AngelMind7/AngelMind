import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, lte, lt, or, sql } from "drizzle-orm";
import { aiModels, aiRunEvaluations, aiRunOutputs, aiRuns, jobs, outboxConsumerReceipts, outboxEvents, researchSessions, researchTasks, workspaces } from "../drizzle/schema";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";
import { planMultiAgentRun } from "./ai-orchestration";
import { invokeLLM, type Message } from "./_core/llm";
import { selectBestRegisteredModel } from "./ai-routing";
import { discoverGatewayModels } from "./ai-catalog";

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

export async function refreshModelCatalog() {
  const db = await getDb();
  if (!db) return { discovered: 0, errors: ["database-unavailable"] };
  const discovery = await discoverGatewayModels();
  for (const model of discovery.models) {
    await db.insert(aiModels).values({ modelKey: model.modelKey, provider: model.provider, gateway: model.gateway, capabilities: JSON.stringify(model.capabilities), contextWindow: model.contextWindow, status: "active", inputCostPerMillionCents: model.inputCostPerMillionCents, outputCostPerMillionCents: model.outputCostPerMillionCents }).onDuplicateKeyUpdate({ set: { provider: model.provider, gateway: model.gateway, capabilities: JSON.stringify(model.capabilities), contextWindow: model.contextWindow, inputCostPerMillionCents: model.inputCostPerMillionCents, outputCostPerMillionCents: model.outputCostPerMillionCents, status: "active", updatedAt: new Date() } });
  }
  return { discovered: discovery.models.length, errors: discovery.errors };
}

export async function selectRegisteredModel(requirements: { capabilities?: string[]; minimumContextWindow?: number; maxCostCentsPerMillionTokens?: number; allowDegraded?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const existing = await db.select().from(aiModels);
  const rows = existing.length ? existing : (await refreshModelCatalog(), await db.select().from(aiModels));
  return selectBestRegisteredModel(rows.map(model => ({ ...model, capabilities: JSON.parse(model.capabilities) as string[] })), requirements);
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
  const [registeredModel] = await db.select().from(aiModels).where(eq(aiModels.modelKey, input.modelKey.trim())).limit(1);
  if (!registeredModel || registeredModel.status !== "active") throw new Error("AI model tidak terdaftar atau tidak aktif.");
  if (input.sessionId) {
    const [session] = await db.select({ workspaceId: researchSessions.workspaceId }).from(researchSessions).where(eq(researchSessions.id, input.sessionId)).limit(1);
    if (!session || session.workspaceId !== workspace.id) throw new Error("Research session tidak cocok dengan workspace AI run.");
  }
  if (input.taskId) {
    const [task] = await db.select({ workspaceId: researchTasks.workspaceId }).from(researchTasks).where(eq(researchTasks.id, input.taskId)).limit(1);
    if (!task || task.workspaceId !== workspace.id) throw new Error("Research task tidak cocok dengan workspace AI run.");
  }
  const estimatedCostCents = Math.max(0, input.estimatedCostCents ?? 0);
  if (workspace.budgetCents > 0 && workspace.spentCents + estimatedCostCents > workspace.budgetCents) throw new Error("AI run blocked by workspace budget ceiling.");
  const traceId = randomUUID();
  const retentionDays = Math.min(3_650, Math.max(1, input.retentionDays ?? 90));
  const retentionUntil = new Date(Date.now() + retentionDays * 86_400_000);
  await db.insert(aiRuns).values({ workspaceId: workspace.id, sessionId: input.sessionId ?? null, taskId: input.taskId ?? null, userId, modelKey: registeredModel.modelKey, gateway: registeredModel.gateway, purpose: input.purpose.trim(), traceId, inputReference: input.inputReference.trim(), status: "queued", costCents: estimatedCostCents, retentionUntil });
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
  try {
    await db.insert(jobs).values({ workspaceId: input.workspaceId ?? null, kind: input.kind.trim(), idempotencyKey, payload: JSON.stringify(input.payload), status: "queued", attempts: 0, maxAttempts: input.maxAttempts ?? 3, availableAt: new Date() });
  } catch (error) {
    const [concurrent] = await db.select().from(jobs).where(eq(jobs.idempotencyKey, idempotencyKey)).limit(1);
    if (concurrent) return concurrent;
    throw error;
  }
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
  const idempotencyKey = input.idempotencyKey.trim();
  try {
    await db.insert(outboxEvents).values({ workspaceId: input.workspaceId ?? null, eventType: input.eventType.trim(), aggregateType: input.aggregateType.trim(), aggregateId: input.aggregateId, idempotencyKey, schemaVersion: input.schemaVersion ?? 1, payload: JSON.stringify(input.payload), status: "pending", attempts: 0 });
  } catch (error) {
    const [concurrent] = await db.select().from(outboxEvents).where(eq(outboxEvents.idempotencyKey, idempotencyKey)).limit(1);
    if (concurrent) return concurrent;
    throw error;
  }
  const [event] = await db.select().from(outboxEvents).where(eq(outboxEvents.idempotencyKey, idempotencyKey)).limit(1);
  return event;
}

export async function claimOutboxConsumer(eventId: number, consumerKey: string, resultHash?: string) {
  const db = await getDb();
  if (!db) return { claimed: false as const, reason: "database-unavailable" as const };
  const normalizedKey = consumerKey.trim();
  if (!normalizedKey) throw new Error("Consumer key is required.");
  const existing = await db.select({ id: outboxConsumerReceipts.id }).from(outboxConsumerReceipts).where(and(eq(outboxConsumerReceipts.eventId, eventId), eq(outboxConsumerReceipts.consumerKey, normalizedKey))).limit(1);
  if (existing[0]) return { claimed: false as const, reason: "already-processed" as const };
  try {
    await db.insert(outboxConsumerReceipts).values({ eventId, consumerKey: normalizedKey, resultHash: resultHash?.trim().slice(0, 64) || null });
    return { claimed: true as const, eventId, consumerKey: normalizedKey };
  } catch {
    return { claimed: false as const, reason: "already-processed" as const };
  }
}

export async function claimOutboxEvent(eventId: number, now = new Date()) {
  const db = await getDb();
  if (!db) return { claimed: false as const, reason: "database-unavailable" as const };
  const staleBefore = new Date(now.getTime() - OUTBOX_LEASE_MS);
  await db.update(outboxEvents).set({ status: "retrying", lockedAt: null, workerId: null, availableAt: now, lastError: "Outbox lease expired." }).where(and(eq(outboxEvents.status, "retrying"), lt(outboxEvents.lockedAt, staleBefore)));
  await db.update(outboxEvents).set({ status: "retrying", lockedAt: now, workerId: WORKER_ID, attempts: sql`${outboxEvents.attempts} + 1` }).where(and(eq(outboxEvents.id, eventId), or(eq(outboxEvents.status, "pending"), eq(outboxEvents.status, "retrying")), lte(outboxEvents.availableAt, now)));
  const [claimed] = await db.select({ id: outboxEvents.id }).from(outboxEvents).where(and(eq(outboxEvents.id, eventId), eq(outboxEvents.status, "retrying"), eq(outboxEvents.workerId, WORKER_ID), eq(outboxEvents.lockedAt, now))).limit(1);
  if (!claimed) return { claimed: false as const, reason: "already-claimed" as const };
  return { claimed: true as const, eventId, workerId: WORKER_ID };
}

export async function markOutboxEventPublished(eventId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.update(outboxEvents).set({ status: "published", publishedAt: new Date(), lockedAt: null, workerId: null, lastError: null }).where(and(eq(outboxEvents.id, eventId), eq(outboxEvents.workerId, WORKER_ID), eq(outboxEvents.status, "retrying")));
  return { success: true as const, eventId, status: "published" as const };
}

export async function failOutboxEvent(eventId: number, errorMessage: string) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [event] = await db.select().from(outboxEvents).where(eq(outboxEvents.id, eventId)).limit(1);
  if (!event) throw new Error("Outbox event tidak ditemukan.");
  const attempts = event.attempts;
  const terminal = attempts >= OUTBOX_MAX_ATTEMPTS;
  const nextStatus = terminal ? "failed" : "retrying";
  const error = errorMessage.trim().slice(0, 4_000) || "Outbox handler failed.";
  const availableAt = new Date(Date.now() + Math.min(60 * 60 * 1_000, 2 ** Math.max(0, attempts - 1) * 5_000));
  await db.update(outboxEvents).set({ status: nextStatus, availableAt: terminal ? event.availableAt : availableAt, lockedAt: null, workerId: null, lastError: error }).where(and(eq(outboxEvents.id, eventId), eq(outboxEvents.workerId, WORKER_ID), eq(outboxEvents.status, "retrying")));
  return { success: !terminal, eventId, status: nextStatus, attempts, error } as const;
}

const WORKER_ID = process.env.WORKER_ID?.trim() || randomUUID();
const WORKER_LEASE_MS = 10 * 60 * 1_000;
const OUTBOX_MAX_ATTEMPTS = 5;
const OUTBOX_LEASE_MS = 2 * 60 * 1_000;

export async function heartbeatJob(jobId: number) {
  const db = await getDb();
  if (!db) return { success: false as const, jobId };
  await db.update(jobs).set({ heartbeatAt: new Date(), leaseExpiresAt: new Date(Date.now() + WORKER_LEASE_MS), updatedAt: new Date() }).where(and(eq(jobs.id, jobId), eq(jobs.status, "running"), eq(jobs.workerId, WORKER_ID)));
  return { success: true as const, jobId };
}

export async function claimPendingJobs(limit = 25) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const staleBefore = new Date(now.getTime() - WORKER_LEASE_MS);
  await db.update(jobs).set({ status: "retrying", lockedAt: null, leaseExpiresAt: null, heartbeatAt: null, workerId: null, availableAt: now, lastError: "Worker lease expired.", updatedAt: now }).where(and(eq(jobs.status, "running"), or(lt(jobs.leaseExpiresAt, now), lt(jobs.lockedAt, staleBefore))));
  const available = await db.select().from(jobs).where(and(or(eq(jobs.status, "queued"), eq(jobs.status, "retrying")), lte(jobs.availableAt, now))).orderBy(asc(jobs.availableAt)).limit(Math.min(100, Math.max(1, limit)));
  const claimed = [];
  for (const job of available) {
    const leaseExpiresAt = new Date(now.getTime() + WORKER_LEASE_MS);
    await db.update(jobs).set({ status: "running", attempts: job.attempts + 1, lockedAt: now, heartbeatAt: now, leaseExpiresAt, workerId: WORKER_ID, updatedAt: now }).where(and(eq(jobs.id, job.id), or(eq(jobs.status, "queued"), eq(jobs.status, "retrying"))));
    claimed.push({ ...job, status: "running" as const, attempts: job.attempts + 1, lockedAt: now, heartbeatAt: now, leaseExpiresAt, workerId: WORKER_ID });
  }
  return claimed;
}

export async function completeJob(jobId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.update(jobs).set({ status: "succeeded", lockedAt: null, leaseExpiresAt: null, heartbeatAt: null, workerId: null, completedAt: new Date(), updatedAt: new Date() }).where(and(eq(jobs.id, jobId), eq(jobs.status, "running"), eq(jobs.workerId, WORKER_ID)));
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
  await db.update(jobs).set({ status: nextStatus, lockedAt: null, leaseExpiresAt: null, heartbeatAt: null, workerId: null, lastError, availableAt: terminal ? job.availableAt : new Date(Date.now() + backoffMs), completedAt: terminal ? new Date() : null, updatedAt: new Date() }).where(and(eq(jobs.id, jobId), eq(jobs.status, "running"), eq(jobs.workerId, WORKER_ID)));
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
      userId,
      workspaceId: input.workspaceId,
      plan,
    },
  });
  return { job, plan };
}


export async function executeOrchestrationPlanJob(payload: Record<string, unknown>) {
  const plan = payload.plan as { objective?: string; evidenceReferences?: string[]; tasks?: Array<{ id: string; role: string; objective: string; dependsOn: string[]; status: string }> };
  const userId = Number(payload.userId);
  const workspaceId = Number(payload.workspaceId);
  const planId = String(payload.planId ?? "").trim();
  if (!plan || !Number.isInteger(userId) || !Number.isInteger(workspaceId) || !planId || !Array.isArray(plan.tasks) || plan.tasks.length === 0) throw new Error("Invalid orchestration plan payload.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [model] = await db.select().from(aiModels).where(eq(aiModels.status, "active")).orderBy(asc(aiModels.updatedAt)).limit(1);
  if (!model) throw new Error("No active AI model is available for orchestration.");
  for (const task of plan.tasks) {
    const inputReference = `orchestration:${planId}:${task.id}`;
    const [existingRun] = await db.select().from(aiRuns).where(eq(aiRuns.inputReference, inputReference)).orderBy(desc(aiRuns.id)).limit(1);
    if (!existingRun) await db.insert(aiRuns).values({ workspaceId, userId, modelKey: model.modelKey, gateway: model.gateway, purpose: `orchestration:${task.role}`, traceId: `${planId}:${task.id}`, inputReference, status: "queued", costCents: 0, retentionUntil: new Date(Date.now() + 90 * 86_400_000) });
    const [run] = await db.select().from(aiRuns).where(eq(aiRuns.inputReference, inputReference)).orderBy(desc(aiRuns.id)).limit(1);
    if (!run) throw new Error(`Could not persist orchestration task ${task.id}.`);
    const idempotencyKey = `orchestration:${planId}:${task.id}`;
    await db.insert(jobs).values({ workspaceId, kind: "ai.run.execute", idempotencyKey, payload: JSON.stringify({ type: "ai_run_execute", runId: run.id, userId, messages: [{ role: "system", content: `You are the ${task.role} agent in a governed orchestration. Respect dependencies and never perform target-facing actions.` }, { role: "user", content: JSON.stringify({ objective: task.objective, dependsOn: task.dependsOn, evidenceReferences: plan.evidenceReferences ?? [] }) }] }), status: "queued", attempts: 0, maxAttempts: 3, availableAt: new Date() }).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  }
  return { planId, tasksQueued: plan.tasks.length, modelKey: model.modelKey };
}

export async function startDurableAiRun(userId: number, input: { workspaceId: number; sessionId?: number; taskId?: number; modelKey?: string; capabilities?: string[]; minimumContextWindow?: number; maxCostCentsPerMillionTokens?: number; allowDegraded?: boolean; purpose: string; inputReference: string; messages: Message[]; estimatedCostCents?: number; retentionDays?: number; idempotencyKey: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const model = input.modelKey?.trim()
    ? (await db.select().from(aiModels).where(eq(aiModels.modelKey, input.modelKey.trim())).limit(1))[0]
    : (await selectRegisteredModel({ capabilities: input.capabilities, minimumContextWindow: input.minimumContextWindow, maxCostCentsPerMillionTokens: input.maxCostCentsPerMillionTokens, allowDegraded: input.allowDegraded })).model;
  if (!model || model.status !== "active") throw new Error("AI model tidak terdaftar atau tidak aktif.");
  const run = await startAiRun(userId, { ...input, modelKey: model.modelKey, gateway: model.gateway });
  const job = await enqueueJob(userId, {
    workspaceId: input.workspaceId,
    kind: "ai.run.execute",
    idempotencyKey: input.idempotencyKey,
    payload: {
      type: "ai_run_execute",
      runId: run.id,
      userId,
      workspaceId: input.workspaceId,
      modelKey: model.modelKey,
      messages: input.messages,
    },
  });
  return { run, job };
}

export async function executeAiRunJob(payload: Record<string, unknown>) {
  const runId = Number(payload.runId);
  const userId = Number(payload.userId);
  const messages = payload.messages as Message[];
  if (!Number.isInteger(runId) || !Number.isInteger(userId) || !Array.isArray(messages) || messages.length === 0) throw new Error("Invalid AI run job payload.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [run] = await db.select().from(aiRuns).where(eq(aiRuns.id, runId)).limit(1);
  if (!run || run.userId !== userId) throw new Error("AI run tidak ditemukan.");
  const [model] = await db.select().from(aiModels).where(eq(aiModels.modelKey, run.modelKey)).limit(1);
  if (!model || model.status !== "active" || model.gateway !== run.gateway) throw new Error("AI model registry validation failed.");
  const modelCapabilities = JSON.parse(model.capabilities) as string[];
  const registeredFallbacks = (await db.select().from(aiModels))
    .filter(candidate => candidate.modelKey !== model.modelKey && candidate.status === "active")
    .filter(candidate => {
      const capabilities = new Set(JSON.parse(candidate.capabilities) as string[]);
      return modelCapabilities.every(capability => capabilities.has(capability)) && candidate.contextWindow >= model.contextWindow;
    })
    .sort((left, right) => {
      const gatewayOrder = (gateway: string) => gateway === run.gateway ? 0 : 1;
      return gatewayOrder(left.gateway) - gatewayOrder(right.gateway) || left.modelKey.localeCompare(right.modelKey);
    })
    .map(candidate => candidate.modelKey);
  await updateAiRun(userId, { runId, status: "running" });
  try {
    const response = await invokeLLM({ model: model.modelKey, fallbackModels: registeredFallbacks, messages });
    await db.insert(aiRunOutputs).values({ workspaceId: run.workspaceId, runId, outputJson: JSON.stringify(response) }).onDuplicateKeyUpdate({ set: { outputJson: JSON.stringify(response), createdAt: new Date() } });
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


export type OutboxEventHandler = (event: { id: number; eventType: string; aggregateType: string; aggregateId: number; schemaVersion: number; payload: Record<string, unknown> }) => Promise<void>;

export async function dispatchPendingOutbox(handlers: Record<string, OutboxEventHandler>, limit = 25) {
  const db = await getDb();
  if (!db) return { claimed: 0, published: 0, failed: 0 };
  const now = new Date();
  const pending = await db.select().from(outboxEvents).where(and(or(eq(outboxEvents.status, "pending"), eq(outboxEvents.status, "retrying")), lte(outboxEvents.availableAt, now))).orderBy(asc(outboxEvents.createdAt)).limit(Math.min(100, Math.max(1, limit)));
  let claimed = 0;
  let published = 0;
  let failed = 0;
  for (const event of pending) {
    const handler = handlers[event.eventType];
    if (!handler) continue;
    const claim = await claimOutboxEvent(event.id, now);
    if (!claim.claimed) continue;
    claimed += 1;
    try {
      const payload: unknown = JSON.parse(event.payload);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Outbox payload must be a JSON object.");
      await handler({ id: event.id, eventType: event.eventType, aggregateType: event.aggregateType, aggregateId: event.aggregateId, schemaVersion: event.schemaVersion, payload: payload as Record<string, unknown> });
      await claimOutboxConsumer(event.id, `dispatcher:${event.eventType}`);
      await markOutboxEventPublished(event.id);
      published += 1;
    } catch (error) {
      await failOutboxEvent(event.id, error instanceof Error ? error.message : "Outbox handler failed.");
      failed += 1;
    }
  }
  return { claimed, published, failed };
}
