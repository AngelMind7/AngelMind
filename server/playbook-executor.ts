import { and, asc, eq, inArray } from "drizzle-orm";
import {
  playbookRuns,
  researchTaskDependencies,
  researchTasks,
} from "../drizzle/schema";
import { getDb } from "./db";
import { assertPassivePlaybookTaskType, executePassiveAdapter } from "./control-plane/intelligence-engine";
import { auditEvents } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { encryptAuditState } from "./control-plane/audit-state-crypto";

async function recordAudit(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  workspaceId: number,
  userId: number,
  subject: string,
  details: Record<string, unknown>
) {
  await db
    .insert(auditEvents)
    .values({
      workspaceId,
      category: "playbook-execution",
      subject,
      traceId: null,
      details: ENV.auditStateEncryptionKey ? encryptAuditState({ actorUserId: userId, ...details }, ENV.auditStateEncryptionKey) : JSON.stringify({ actorUserId: userId, ...details }),
      evidenceHash:
        `${workspaceId}:${userId}:${subject}:${JSON.stringify(details)}`.slice(
          0,
          128
        ),
    });
}

type Checkpoint = {
  completedTaskIds: number[];
  failedTaskIds: number[];
  blockedTaskIds?: number[];
  nextTaskIndex: number;
};

function parseCheckpoint(value: string): Checkpoint {
  try {
    const parsed = JSON.parse(value) as Partial<Checkpoint>;
    return {
      completedTaskIds: Array.isArray(parsed.completedTaskIds)
        ? parsed.completedTaskIds.filter(Number.isInteger)
        : [],
      failedTaskIds: Array.isArray(parsed.failedTaskIds)
        ? parsed.failedTaskIds.filter(Number.isInteger)
        : [],
      blockedTaskIds: Array.isArray(parsed.blockedTaskIds)
        ? parsed.blockedTaskIds.filter(Number.isInteger)
        : [],
      nextTaskIndex:
        Number.isInteger(parsed.nextTaskIndex) &&
        Number(parsed.nextTaskIndex) >= 0
          ? Number(parsed.nextTaskIndex)
          : 0,
    };
  } catch {
    throw new Error("Playbook checkpoint is invalid.");
  }
}

export function reconcileCompletedTaskIds(
  taskIds: readonly number[],
  checkpointIds: readonly number[]
): Set<number> {
  const validIds = new Set(taskIds);
  return new Set(checkpointIds.filter(id => validIds.has(id)));
}

export function selectDependencyReadyTask<
  T extends { id: number; status: string; priority: number },
>(
  tasks: T[],
  dependencies: Array<{ taskId: number; dependsOnTaskId: number }>,
  completedIds: Set<number>
) {
  const dependencyMap = new Map<number, number[]>();
  for (const dependency of dependencies)
    dependencyMap.set(dependency.taskId, [
      ...(dependencyMap.get(dependency.taskId) ?? []),
      dependency.dependsOnTaskId,
    ]);
  return tasks
    .filter(task => task.status === "queued")
    .filter(task =>
      (dependencyMap.get(task.id) ?? []).every(dependencyId =>
        completedIds.has(dependencyId)
      )
    )
    .sort((a, b) => b.priority - a.priority || a.id - b.id)[0];
}

export function hasDependencyCycle(
  taskIds: readonly number[],
  dependencies: Array<{ taskId: number; dependsOnTaskId: number }>
): boolean {
  const allowed = new Set(taskIds);
  const graph = new Map<number, number[]>();
  for (const id of taskIds) graph.set(id, []);
  for (const dependency of dependencies) {
    if (!allowed.has(dependency.taskId) || !allowed.has(dependency.dependsOnTaskId)) continue;
    graph.get(dependency.taskId)!.push(dependency.dependsOnTaskId);
  }
  const visiting = new Set<number>();
  const visited = new Set<number>();
  const visit = (id: number): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const dependencyId of graph.get(id) ?? []) {
      if (visit(dependencyId)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return taskIds.some(visit);
}

export type PlaybookExecutionResult =
  | { status: "completed"; runId: number; taskId?: number }
  | { status: "paused"; runId: number; taskId?: number; reason: string }
  | { status: "failed"; runId: number; reason: string };

/**
 * Advances one playbook run step. Target-facing execution is intentionally not
 * inferred from a task template. An approved passive adapter must be supplied
 * by a future provider integration; otherwise the run is paused, never faked.
 */
export async function executePlaybookRunJob(
  payload: Record<string, unknown>
): Promise<PlaybookExecutionResult> {
  const runId = Number(payload.runId);
  if (!Number.isInteger(runId) || runId <= 0)
    throw new Error("Invalid playbook run job payload.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [run] = await db
    .select()
    .from(playbookRuns)
    .where(eq(playbookRuns.id, runId))
    .limit(1);
  if (!run) throw new Error("Playbook run tidak ditemukan.");
  if (["completed", "cancelled"].includes(run.status)) {
    return run.status === "completed"
      ? { status: "completed", runId }
      : { status: "failed", runId, reason: "Playbook run was cancelled." };
  }
  if (!["queued", "running", "paused"].includes(run.status)) {
    return { status: "failed", runId, reason: `Playbook run is not executable from status '${run.status}'.` };
  }

  const taskIdsValue = JSON.parse(run.taskIds) as unknown;
  if (!Array.isArray(taskIdsValue) || taskIdsValue.some(id => !Number.isInteger(id)))
    throw new Error("Playbook task list is invalid.");
  const ids = Array.from(new Set(taskIdsValue as number[]));
  const checkpoint = parseCheckpoint(run.checkpoint);
  const completedIds = reconcileCompletedTaskIds(ids, checkpoint.completedTaskIds);

  // Prevent two worker claims from advancing the same run concurrently.
  if (run.status === "queued" || run.status === "paused") {
    const claim = await db
      .update(playbookRuns)
      .set({ status: "running", startedAt: run.startedAt ?? new Date(), updatedAt: new Date() })
      .where(and(eq(playbookRuns.id, run.id), inArray(playbookRuns.status, ["queued", "paused"])));
    if ("affectedRows" in claim && Number(claim.affectedRows) === 0) {
      return { status: "paused", runId, reason: "Playbook run is already being processed by another worker." };
    }
  }

  const tasks = ids.length
    ? await db
        .select()
        .from(researchTasks)
        .where(
          and(
            eq(researchTasks.workspaceId, run.workspaceId),
            inArray(researchTasks.id, ids)
          )
        )
        .orderBy(asc(researchTasks.id))
    : [];
  const dependencies = ids.length
    ? await db
        .select({
          taskId: researchTaskDependencies.taskId,
          dependsOnTaskId: researchTaskDependencies.dependsOnTaskId,
        })
        .from(researchTaskDependencies)
        .where(
          and(
            eq(researchTaskDependencies.workspaceId, run.workspaceId),
            inArray(researchTaskDependencies.taskId, ids)
          )
        )
    : [];

  if (ids.length === 0 || completedIds.size >= ids.length) {
    await db
      .update(playbookRuns)
      .set({
        status: "completed",
        checkpoint: JSON.stringify({ ...checkpoint, completedTaskIds: ids, nextTaskIndex: ids.length }),
        completedAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(playbookRuns.id, run.id));
    return { status: "completed", runId };
  }

  if (tasks.length !== ids.length) {
    const reason = "Playbook run references one or more missing tasks.";
    await db.update(playbookRuns).set({ status: "failed", lastError: reason, updatedAt: new Date() }).where(eq(playbookRuns.id, run.id));
    await recordAudit(db, run.workspaceId, run.createdByUserId, "playbook-run-failed-missing-task", { playbookRunId: run.id, expectedTaskCount: ids.length, actualTaskCount: tasks.length });
    return { status: "failed", runId, reason };
  }

  const hasOutOfRunDependency = dependencies.some(dependency => !ids.includes(dependency.dependsOnTaskId));
  if (hasOutOfRunDependency) {
    const reason = "Playbook dependency references a task outside the run; execution is blocked fail-closed.";
    await db.update(playbookRuns).set({ status: "failed", lastError: reason, updatedAt: new Date() }).where(eq(playbookRuns.id, run.id));
    await recordAudit(db, run.workspaceId, run.createdByUserId, "playbook-run-failed-external-dependency", { playbookRunId: run.id });
    return { status: "failed", runId, reason };
  }

  if (hasDependencyCycle(ids, dependencies)) {
    const reason = "Playbook dependency graph contains a cycle.";
    await db.update(playbookRuns).set({ status: "failed", lastError: reason, updatedAt: new Date() }).where(eq(playbookRuns.id, run.id));
    await recordAudit(db, run.workspaceId, run.createdByUserId, "playbook-run-failed-dependency-cycle", { playbookRunId: run.id });
    return { status: "failed", runId, reason };
  }

  const task = selectDependencyReadyTask(tasks, dependencies, completedIds);
  if (!task) {
    const reason = "No dependency-ready task is available; the run is blocked by unfinished prerequisites.";
    await db
      .update(playbookRuns)
      .set({
        status: "paused",
        checkpoint: JSON.stringify({ ...checkpoint, blockedTaskIds: ids.filter(id => !completedIds.has(id)) }),
        lastError: reason,
        updatedAt: new Date(),
      })
      .where(eq(playbookRuns.id, run.id));
    return { status: "paused", runId, reason };
  }

  const safeType = assertPassivePlaybookTaskType(task.type);
  let taskInputs: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(task.inputs) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) taskInputs = parsed as Record<string, unknown>;
  } catch {
    taskInputs = {};
  }
  if (typeof taskInputs.adapterKey === "string") {
    const feedback = executePassiveAdapter(taskInputs.adapterKey, taskInputs);
    const completedTaskIds = Array.from(new Set([...completedIds, task.id]));
    const runCompleted = completedTaskIds.length >= ids.length;
    await db.update(researchTasks).set({ status: "completed", outputs: JSON.stringify(feedback), completedAt: new Date(), updatedAt: new Date() }).where(and(eq(researchTasks.id, task.id), eq(researchTasks.workspaceId, run.workspaceId), eq(researchTasks.status, "queued")));
    await db.update(playbookRuns).set({ status: runCompleted ? "completed" : "queued", checkpoint: JSON.stringify({ ...checkpoint, completedTaskIds, nextTaskIndex: checkpoint.nextTaskIndex + 1, blockedTaskIds: (checkpoint.blockedTaskIds ?? []).filter(id => id !== task.id) }), completedAt: runCompleted ? new Date() : null, lastError: null, updatedAt: new Date() }).where(eq(playbookRuns.id, run.id));
    await recordAudit(db, run.workspaceId, run.createdByUserId, "playbook-task-passive-adapter-completed", { playbookRunId: run.id, taskId: task.id, adapterKey: feedback.adapterKey, networkCalls: feedback.networkCalls });
    return { status: "completed", runId, taskId: task.id };
  }

  const reason = `No approved passive adapter is registered for task type '${safeType}'.`;
  await db
    .update(researchTasks)
    .set({ status: "blocked", outputs: JSON.stringify({ status: "blocked", reason, requiresAdapter: true }), updatedAt: new Date() })
    .where(and(eq(researchTasks.id, task.id), eq(researchTasks.workspaceId, run.workspaceId), eq(researchTasks.status, "queued")));
  await db
    .update(playbookRuns)
    .set({ status: "paused", checkpoint: JSON.stringify({ ...checkpoint, blockedTaskIds: [...(checkpoint.blockedTaskIds ?? []), task.id] }), lastError: reason, updatedAt: new Date() })
    .where(eq(playbookRuns.id, run.id));
  await recordAudit(db, run.workspaceId, run.createdByUserId, "playbook-run-paused-adapter-required", { playbookRunId: run.id, taskId: task.id, taskType: safeType });
  return { status: "paused", runId, taskId: task.id, reason };
}

export function playbookJobPayload(runId: number) {
  return { type: "playbook_run", runId };
}