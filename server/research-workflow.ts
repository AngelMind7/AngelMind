import { createHash } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  auditEvents,
  researchAssets,
  researchHypotheses,
  researchObservations,
  researchSessions,
  researchTasks,
  workspaces,
} from "../drizzle/schema";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";
import { isTargetInScope } from "./control-plane/guardrails";

const sessionTransitions: Record<string, string[]> = {
  draft: ["ready", "archived"],
  ready: ["active", "archived"],
  active: ["paused", "completed"],
  paused: ["active", "archived"],
  completed: ["archived"],
  archived: [],
};
const hypothesisTransitions: Record<string, string[]> = {
  proposed: ["investigating", "archived"],
  investigating: ["supported", "disproven", "validated", "archived"],
  supported: ["validated", "archived"],
  disproven: ["archived"],
  validated: ["archived"],
  archived: [],
};
const taskTransitions: Record<string, string[]> = {
  queued: ["running", "blocked", "cancelled"],
  running: ["paused", "failed", "retrying", "completed", "cancelled"],
  blocked: ["queued", "cancelled"],
  paused: ["queued", "cancelled"],
  failed: ["retrying", "cancelled"],
  retrying: ["queued", "running", "failed", "cancelled"],
  completed: [],
  cancelled: [],
};

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function requireWorkspace(userId: number, workspaceId: number, intent: "read" | "respond" | "manage" = "read") {
  const allowed = await canAccessWorkspace(userId, workspaceId, intent);
  if (!allowed) throw new Error("Workspace tidak ditemukan atau tidak dapat diakses.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  if (!workspace) throw new Error("Workspace tidak ditemukan.");
  return { db, workspace };
}

async function requireSession(userId: number, sessionId: number, intent: "read" | "respond" | "manage" = "read") {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [session] = await db.select().from(researchSessions).where(eq(researchSessions.id, sessionId)).limit(1);
  if (!session) throw new Error("Research session tidak ditemukan.");
  const allowed = await canAccessWorkspace(userId, session.workspaceId, intent);
  if (!allowed) throw new Error("Research session tidak dapat diakses.");
  return { db, session };
}

async function addResearchAudit(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, workspaceId: number, userId: number, subject: string, details: Record<string, unknown>) {
  await db.insert(auditEvents).values({
    workspaceId,
    category: "research-workflow",
    subject,
    details: JSON.stringify({ actorUserId: userId, ...details }),
    evidenceHash: digest(JSON.stringify({ workspaceId, userId, subject, details })),
  });
}

export async function listResearchSessions(userId: number, workspaceId: number) {
  const { db } = await requireWorkspace(userId, workspaceId);
  return db.select().from(researchSessions).where(eq(researchSessions.workspaceId, workspaceId)).orderBy(desc(researchSessions.updatedAt));
}

export async function createResearchSession(userId: number, input: { workspaceId: number; title: string }) {
  const { db, workspace } = await requireWorkspace(userId, input.workspaceId, "respond");
  const scopeDigest = digest(JSON.stringify({ allowlist: workspace.allowlist, exclusions: workspace.exclusions, safeHarbor: workspace.safeHarbor, codeOfConduct: workspace.codeOfConduct }));
  await db.insert(researchSessions).values({ workspaceId: workspace.id, ownerUserId: userId, title: input.title.trim(), state: "draft", scopeDigest });
  const [session] = await db.select().from(researchSessions).where(and(eq(researchSessions.workspaceId, workspace.id), eq(researchSessions.ownerUserId, userId), eq(researchSessions.title, input.title.trim()))).orderBy(desc(researchSessions.createdAt)).limit(1);
  if (!session) throw new Error("Research session could not be created.");
  await addResearchAudit(db, workspace.id, userId, "research-session-created", { sessionId: session.id, scopeDigest });
  return session;
}

export async function transitionResearchSession(userId: number, sessionId: number, nextState: "draft" | "ready" | "active" | "paused" | "completed" | "archived") {
  const { db, session } = await requireSession(userId, sessionId, "respond");
  if (!sessionTransitions[session.state]?.includes(nextState)) throw new Error(`Invalid research session transition: ${session.state} -> ${nextState}`);
  await db.update(researchSessions).set({ state: nextState, completedAt: nextState === "completed" || nextState === "archived" ? new Date() : null, updatedAt: new Date() }).where(eq(researchSessions.id, session.id));
  await addResearchAudit(db, session.workspaceId, userId, "research-session-transitioned", { sessionId, from: session.state, to: nextState });
  return { success: true as const, sessionId, state: nextState };
}

export async function listResearchAssets(userId: number, sessionId: number) {
  const { db, session } = await requireSession(userId, sessionId);
  return db.select().from(researchAssets).where(eq(researchAssets.sessionId, session.id)).orderBy(asc(researchAssets.hostname), asc(researchAssets.value));
}

export async function createResearchAsset(userId: number, input: { sessionId: number; assetType: "domain" | "subdomain" | "ip" | "application" | "api" | "endpoint" | "technology" | "service"; value: string; hostname?: string; metadata?: Record<string, unknown> }) {
  const { db, session } = await requireSession(userId, input.sessionId, "respond");
  const [workspace] = await db.select({ allowlist: workspaces.allowlist, exclusions: workspaces.exclusions }).from(workspaces).where(eq(workspaces.id, session.workspaceId)).limit(1);
  if (!workspace) throw new Error("Research workspace tidak ditemukan.");
  const value = input.value.trim();
  const target = (input.hostname ?? value).trim();
  if (!value) throw new Error("Asset value is required.");
  if (!target) throw new Error("Asset hostname is required for scope validation.");
  const inScope = isTargetInScope(target, parseJson<string[]>(workspace.allowlist, []), parseJson<string[]>(workspace.exclusions, []));
  await db.insert(researchAssets).values({ workspaceId: session.workspaceId, sessionId: session.id, assetType: input.assetType, value, hostname: input.hostname?.trim() || null, state: inScope ? "in_scope" : "out_of_scope", inScope: inScope ? 1 : 0, metadata: JSON.stringify({ ...(input.metadata ?? {}), scopeTarget: target, scopeCheckedAt: new Date().toISOString() }), createdByUserId: userId });
  const [asset] = await db.select().from(researchAssets).where(and(eq(researchAssets.sessionId, session.id), eq(researchAssets.value, value))).limit(1);
  if (!asset) throw new Error("Asset could not be created.");
  await addResearchAudit(db, session.workspaceId, userId, "research-asset-created", { sessionId: session.id, assetId: asset.id, inScope, target });
  return asset;
}

export async function listResearchObservations(userId: number, sessionId: number) {
  const { db, session } = await requireSession(userId, sessionId);
  return db.select().from(researchObservations).where(eq(researchObservations.sessionId, session.id)).orderBy(desc(researchObservations.createdAt));
}

export async function createResearchObservation(userId: number, input: { sessionId: number; assetId?: number; title: string; content: string }) {
  const { db, session } = await requireSession(userId, input.sessionId, "respond");
  if (input.assetId) {
    const [asset] = await db.select().from(researchAssets).where(and(eq(researchAssets.id, input.assetId), eq(researchAssets.sessionId, session.id), eq(researchAssets.inScope, 1))).limit(1);
    if (!asset) throw new Error("Observation must reference an in-scope asset from the same session.");
  }
  await db.insert(researchObservations).values({ workspaceId: session.workspaceId, sessionId: session.id, assetId: input.assetId ?? null, title: input.title.trim(), content: input.content.trim(), status: "new", createdByUserId: userId });
  const [observation] = await db.select().from(researchObservations).where(and(eq(researchObservations.sessionId, session.id), eq(researchObservations.title, input.title.trim()))).orderBy(desc(researchObservations.createdAt)).limit(1);
  if (!observation) throw new Error("Observation could not be created.");
  await addResearchAudit(db, session.workspaceId, userId, "research-observation-created", { sessionId: session.id, observationId: observation.id, assetId: input.assetId ?? null });
  return observation;
}

export async function listResearchHypotheses(userId: number, sessionId: number) {
  const { db, session } = await requireSession(userId, sessionId);
  return db.select().from(researchHypotheses).where(eq(researchHypotheses.sessionId, session.id)).orderBy(desc(researchHypotheses.priority), desc(researchHypotheses.updatedAt));
}

export async function createResearchHypothesis(userId: number, input: { sessionId: number; assetId?: number; observationId?: number; description: string; reason: string; priority: number }) {
  const { db, session } = await requireSession(userId, input.sessionId, "respond");
  if (input.observationId) {
    const [observation] = await db.select().from(researchObservations).where(and(eq(researchObservations.id, input.observationId), eq(researchObservations.sessionId, session.id))).limit(1);
    if (!observation) throw new Error("Hypothesis must reference an observation from the same session.");
  }
  await db.insert(researchHypotheses).values({ workspaceId: session.workspaceId, sessionId: session.id, assetId: input.assetId ?? null, observationId: input.observationId ?? null, description: input.description.trim(), reason: input.reason.trim(), priority: input.priority, status: "proposed", evidence: "[]", aiAnalysis: null, outcome: null, createdByUserId: userId });
  const [hypothesis] = await db.select().from(researchHypotheses).where(and(eq(researchHypotheses.sessionId, session.id), eq(researchHypotheses.description, input.description.trim()))).orderBy(desc(researchHypotheses.createdAt)).limit(1);
  if (!hypothesis) throw new Error("Hypothesis could not be created.");
  await addResearchAudit(db, session.workspaceId, userId, "research-hypothesis-created", { sessionId: session.id, hypothesisId: hypothesis.id });
  return hypothesis;
}

export async function transitionResearchHypothesis(userId: number, hypothesisId: number, nextStatus: "proposed" | "investigating" | "supported" | "disproven" | "validated" | "archived", outcome?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [hypothesis] = await db.select().from(researchHypotheses).where(eq(researchHypotheses.id, hypothesisId)).limit(1);
  if (!hypothesis || !(await canAccessWorkspace(userId, hypothesis.workspaceId, "respond"))) throw new Error("Hypothesis tidak ditemukan atau tidak dapat diakses.");
  if (!hypothesisTransitions[hypothesis.status]?.includes(nextStatus)) throw new Error(`Invalid hypothesis transition: ${hypothesis.status} -> ${nextStatus}`);
  await db.update(researchHypotheses).set({ status: nextStatus, outcome: outcome?.trim() || hypothesis.outcome, updatedAt: new Date() }).where(eq(researchHypotheses.id, hypothesisId));
  await addResearchAudit(db, hypothesis.workspaceId, userId, "research-hypothesis-transitioned", { hypothesisId, from: hypothesis.status, to: nextStatus });
  return { success: true as const, hypothesisId, status: nextStatus };
}

export async function listResearchTasks(userId: number, sessionId: number) {
  const { db, session } = await requireSession(userId, sessionId);
  return db.select().from(researchTasks).where(eq(researchTasks.sessionId, session.id)).orderBy(asc(researchTasks.status), desc(researchTasks.priority), desc(researchTasks.createdAt));
}

export async function createResearchTask(userId: number, input: { sessionId: number; type: string; title: string; priority: number; dependencies: number[]; ownerUserId?: number; inputs?: Record<string, unknown> }) {
  const { db, session } = await requireSession(userId, input.sessionId, "respond");
  const dependencies = Array.from(new Set(input.dependencies));
  if (dependencies.includes(0) || dependencies.some(id => id < 1)) throw new Error("Task dependencies must use positive IDs.");
  if (dependencies.length) {
    const rows = await db.select({ id: researchTasks.id }).from(researchTasks).where(and(eq(researchTasks.sessionId, session.id), inArray(researchTasks.id, dependencies)));
    if (rows.length !== dependencies.length) throw new Error("Task dependency must belong to the same research session.");
  }
  await db.insert(researchTasks).values({ workspaceId: session.workspaceId, sessionId: session.id, type: input.type.trim(), title: input.title.trim(), priority: input.priority, status: "queued", ownerUserId: input.ownerUserId ?? null, dependencies: JSON.stringify(dependencies), inputs: JSON.stringify(input.inputs ?? {}), outputs: "{}", retryCount: 0, createdByUserId: userId });
  const [task] = await db.select().from(researchTasks).where(and(eq(researchTasks.sessionId, session.id), eq(researchTasks.title, input.title.trim()))).orderBy(desc(researchTasks.createdAt)).limit(1);
  if (!task) throw new Error("Task could not be created.");
  await addResearchAudit(db, session.workspaceId, userId, "research-task-created", { sessionId: session.id, taskId: task.id, dependencies });
  return task;
}

export async function transitionResearchTask(userId: number, taskId: number, nextStatus: "queued" | "running" | "blocked" | "paused" | "failed" | "retrying" | "completed" | "cancelled", outputs?: Record<string, unknown>) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [task] = await db.select().from(researchTasks).where(eq(researchTasks.id, taskId)).limit(1);
  if (!task || !(await canAccessWorkspace(userId, task.workspaceId, "respond"))) throw new Error("Task tidak ditemukan atau tidak dapat diakses.");
  if (!taskTransitions[task.status]?.includes(nextStatus)) throw new Error(`Invalid task transition: ${task.status} -> ${nextStatus}`);
  if (nextStatus === "running") {
    const dependencies = parseJson<number[]>(task.dependencies, []);
    if (dependencies.length) {
      const dependencyRows = await db.select({ status: researchTasks.status }).from(researchTasks).where(inArray(researchTasks.id, dependencies));
      if (dependencyRows.some(row => row.status !== "completed")) throw new Error("Task blocked: all dependencies must be completed first.");
    }
  }
  await db.update(researchTasks).set({ status: nextStatus, outputs: outputs ? JSON.stringify(outputs) : task.outputs, retryCount: nextStatus === "retrying" ? task.retryCount + 1 : task.retryCount, completedAt: nextStatus === "completed" || nextStatus === "cancelled" ? new Date() : null, updatedAt: new Date() }).where(eq(researchTasks.id, taskId));
  await addResearchAudit(db, task.workspaceId, userId, "research-task-transitioned", { taskId, from: task.status, to: nextStatus });
  return { success: true as const, taskId, status: nextStatus };
}
