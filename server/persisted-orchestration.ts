import { createHash } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";
import { orchestrationNodes, orchestrationRuns } from "../drizzle/schema";
import { planMultiAgentRun, type AgentRole } from "./ai-orchestration";

async function access(userId: number, workspaceId: number, intent: "read" | "respond" = "read") {
  const db = await getDb();
  if (!db || !(await canAccessWorkspace(userId, workspaceId, intent))) throw new Error("Workspace tidak ditemukan atau tidak dapat diakses.");
  return db;
}

export function validatePersistedNodeTransition(current: "queued" | "blocked" | "running" | "completed" | "failed" | "needs_review", next: "running" | "completed" | "failed" | "needs_review", evidenceHash?: string, dependencyStatuses: string[] = []) {
  if (current === "completed" || current === "failed") throw new Error("Terminal orchestration node cannot transition.");
  if ((next === "running" || next === "completed") && dependencyStatuses.some(status => status !== "completed")) throw new Error("Orchestration dependencies must complete before this node can run.");
  if (next === "completed" && !/^[a-f0-9]{64}$/.test(evidenceHash ?? "")) throw new Error("Completed orchestration node requires evidence hash.");
  return true;
}

export async function createPersistedOrchestration(userId: number, input: { workspaceId: number; objective: string; roles: AgentRole[]; evidenceReferences?: string[] }) {
  const db = await access(userId, input.workspaceId, "respond");
  const plan = planMultiAgentRun(input);
  const planHash = createHash("sha256").update(JSON.stringify(plan)).digest("hex");
  const [runId] = await db.insert(orchestrationRuns).values({ workspaceId: input.workspaceId, createdByUserId: userId, objective: plan.objective, evidenceReferences: JSON.stringify(plan.evidenceReferences), planHash, status: "queued" }).$returningId();
  for (const task of plan.tasks) {
    await db.insert(orchestrationNodes).values({ workspaceId: input.workspaceId, orchestrationRunId: runId.id, taskKey: task.id, role: task.role, objective: task.objective, dependsOn: JSON.stringify(task.dependsOn), status: task.status });
  }
  return getPersistedOrchestration(userId, input.workspaceId, runId.id);
}

export async function getPersistedOrchestration(userId: number, workspaceId: number, runId: number) {
  const db = await access(userId, workspaceId);
  const [run] = await db.select().from(orchestrationRuns).where(and(eq(orchestrationRuns.id, runId), eq(orchestrationRuns.workspaceId, workspaceId))).limit(1);
  if (!run) throw new Error("Orchestration run tidak ditemukan.");
  const nodes = await db.select().from(orchestrationNodes).where(and(eq(orchestrationNodes.orchestrationRunId, runId), eq(orchestrationNodes.workspaceId, workspaceId))).orderBy(asc(orchestrationNodes.id));
  return { run, nodes };
}

export async function setOrchestrationNodeStatus(userId: number, input: { workspaceId: number; runId: number; nodeId: number; status: "running" | "completed" | "failed" | "needs_review"; observationJson?: string; evidenceHash?: string }) {
  const db = await access(userId, input.workspaceId, "respond");
  const [node] = await db.select().from(orchestrationNodes).where(and(eq(orchestrationNodes.id, input.nodeId), eq(orchestrationNodes.orchestrationRunId, input.runId), eq(orchestrationNodes.workspaceId, input.workspaceId))).limit(1);
  if (!node) throw new Error("Orchestration node tidak ditemukan.");
  let dependencyKeys: unknown;
  try { dependencyKeys = JSON.parse(node.dependsOn); } catch { throw new Error("Orchestration dependency graph is malformed."); }
  if (!Array.isArray(dependencyKeys) || !dependencyKeys.every(value => typeof value === "string")) throw new Error("Orchestration dependency graph is malformed.");
  const dependencies = dependencyKeys.length ? await db.select({ taskKey: orchestrationNodes.taskKey, status: orchestrationNodes.status }).from(orchestrationNodes).where(and(eq(orchestrationNodes.orchestrationRunId, input.runId), eq(orchestrationNodes.workspaceId, input.workspaceId))) : [];
  const dependencyStatuses = dependencyKeys.map(key => dependencies.find(item => item.taskKey === key)?.status ?? "missing");
  validatePersistedNodeTransition(node.status, input.status, input.evidenceHash, dependencyStatuses);
  await db.update(orchestrationNodes).set({ status: input.status, observationJson: input.observationJson ?? node.observationJson, evidenceHash: input.evidenceHash ?? node.evidenceHash, updatedAt: new Date() }).where(eq(orchestrationNodes.id, node.id));
  return getPersistedOrchestration(userId, input.workspaceId, input.runId);
}
