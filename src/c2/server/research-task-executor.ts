import { and, eq } from "drizzle-orm";
import { researchTasks, researchSessions, researchTaskDependencies } from "../database/schema";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";
import { enqueueJob } from "./ai-platform";
import { executeToolPipeline, persistToolPipelineObservation } from "./tool-execution-pipeline";
import { transitionResearchTask } from "./research-workflow";
import type { ToolRuntimeRequest } from "./tool-runtime";

const EXECUTABLE_MODES: ToolRuntimeRequest["mode"][] = ["offline_artifact", "passive_readonly"];

function parseObject(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not-object");
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseStringArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map(item => item.trim()) : [];
  } catch {
    return [];
  }
}

export async function enqueueResearchTask(userId: number, input: { taskId: number; idempotencyKey?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [task] = await db.select().from(researchTasks).where(eq(researchTasks.id, input.taskId)).limit(1);
  if (!task || !(await canAccessWorkspace(userId, task.workspaceId, "respond"))) throw new Error("Research task tidak ditemukan atau tidak dapat diakses.");
  if (!["queued", "retrying"].includes(task.status)) throw new Error("Hanya task queued atau retrying yang dapat diantrikan.");
  const key = input.idempotencyKey?.trim() || `research-task:${task.id}:revision:${task.revision}`;
  return enqueueJob(userId, {
    workspaceId: task.workspaceId,
    kind: "research.task.execute",
    idempotencyKey: key,
    traceId: task.traceId,
    payload: { type: "research_task_execute", taskId: task.id, userId, workspaceId: task.workspaceId },
    maxAttempts: 3,
  });
}

export async function enqueueReadyResearchTasks(userId: number, input: { sessionId: number; limit?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [session] = await db.select({ id: researchSessions.id, workspaceId: researchSessions.workspaceId }).from(researchSessions).where(eq(researchSessions.id, input.sessionId)).limit(1);
  if (!session || !(await canAccessWorkspace(userId, session.workspaceId, "respond"))) throw new Error("Research session tidak ditemukan atau tidak dapat diakses.");
  const limit = Math.min(100, Math.max(1, Math.trunc(input.limit ?? 25)));
  const candidates = await db.select().from(researchTasks).where(and(eq(researchTasks.sessionId, session.id), eq(researchTasks.workspaceId, session.workspaceId), eq(researchTasks.status, "queued"))).orderBy(researchTasks.priority, researchTasks.id).limit(limit * 3);
  const queued: Awaited<ReturnType<typeof enqueueJob>>[] = [];
  for (const task of candidates) {
    if (queued.length >= limit) break;
    const dependencies = await db.select({ dependsOnTaskId: researchTaskDependencies.dependsOnTaskId }).from(researchTaskDependencies).where(and(eq(researchTaskDependencies.taskId, task.id), eq(researchTaskDependencies.workspaceId, session.workspaceId)));
    if (dependencies.length) {
      const dependencyRows = await db.select({ id: researchTasks.id, status: researchTasks.status }).from(researchTasks).where(and(eq(researchTasks.workspaceId, session.workspaceId), eq(researchTasks.sessionId, session.id)));
      const statusById = new Map(dependencyRows.map(row => [row.id, row.status]));
      if (dependencies.some(dependency => statusById.get(dependency.dependsOnTaskId) !== "completed")) continue;
    }
    queued.push(await enqueueResearchTask(userId, { taskId: task.id }));
  }
  return { sessionId: session.id, queued: queued.length, jobs: queued };
}

export async function executeResearchTaskJob(payload: Record<string, unknown>, attempt = 1) {
  if (payload.type !== "research_task_execute" || typeof payload.taskId !== "number" || typeof payload.userId !== "number") throw new Error("Unsupported research task payload.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [task] = await db.select().from(researchTasks).where(eq(researchTasks.id, payload.taskId)).limit(1);
  if (!task) throw new Error("Research task tidak ditemukan.");
  if (!["queued", "retrying"].includes(task.status)) return { taskId: task.id, status: task.status, idempotent: true };
  const [session] = await db.select({ id: researchSessions.id }).from(researchSessions).where(and(eq(researchSessions.id, task.sessionId), eq(researchSessions.workspaceId, task.workspaceId))).limit(1);
  if (!session) throw new Error("Research session tidak cocok dengan workspace task.");

  await transitionResearchTask(Number(payload.userId), task.id, "running", undefined, task.revision);
  const inputs = parseObject(task.inputs);
  const toolKey = stringValue(inputs.toolKey) ?? stringValue(inputs.adapter) ?? parseStringArray(task.suggestedAdapters)[0];
  const mode = stringValue(inputs.mode) as ToolRuntimeRequest["mode"] | undefined;
  const target = stringValue(inputs.input) ?? stringValue(inputs.target) ?? stringValue(inputs.assetValue);
  if (!toolKey || !mode || !EXECUTABLE_MODES.includes(mode) || !target) {
    const outputs = { state: "blocked", reason: "passive_adapter_input_required", required: ["toolKey", "mode", "input"], attempt };
    await transitionResearchTask(Number(payload.userId), task.id, "failed", outputs);
    return { taskId: task.id, status: "failed", outputs };
  }

  try {
    const result = await executeToolPipeline({
      toolKey,
      mode,
      input: target,
      scopeValidated: true,
      humanApproval: false,
      capabilities: Array.isArray(inputs.capabilities) ? inputs.capabilities.filter((value): value is string => typeof value === "string") : [],
    });
    if (result.runtime.status !== "completed") throw new Error(`Tool execution ${result.runtime.status} for ${toolKey}.`);
    const observation = await persistToolPipelineObservation(Number(payload.userId), { sessionId: task.sessionId, assetId: typeof inputs.assetId === "number" ? inputs.assetId : undefined, request: { toolKey, mode, input: target, scopeValidated: true, humanApproval: false }, }, result);
    const outputs = { state: "completed", toolKey, requestId: result.runtime.requestId, observationId: observation.id, phases: result.phases, provenance: result.provenance, recordCount: result.parsedRecords.length };
    await transitionResearchTask(Number(payload.userId), task.id, "completed", outputs);
    return { taskId: task.id, status: "completed", outputs };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Research task execution failed.";
    await transitionResearchTask(Number(payload.userId), task.id, attempt >= 3 ? "failed" : "retrying", { state: attempt >= 3 ? "failed" : "retrying", error: message.slice(0, 1000), attempt });
    throw error;
  }
}
