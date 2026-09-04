import { and, eq } from "drizzle-orm";
import { researchTasks } from "../drizzle/schema";
import { getDb } from "./db";
import { approveResearchTask, transitionResearchTask } from "./research-workflow";
import { executeGovernedCapability } from "./governed-execution-service";
import { parseStoredTaskCapabilities } from "./research-task-capabilities";

export type ResearchTaskExecutionResult = {
  taskId: number;
  status: "blocked" | "completed" | "failed" | "unavailable" | "timed_out";
  reason?: string;
  execution?: Awaited<ReturnType<typeof executeGovernedCapability>>;
};

/**
 * Bridges persisted research tasks into the governed execution boundary.
 * This service deliberately does not bypass task approval or scope policy.
 */
export async function executeResearchTask(userId: number, taskId: number): Promise<ResearchTaskExecutionResult> {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [task] = await db.select().from(researchTasks).where(eq(researchTasks.id, taskId)).limit(1);
  if (!task) throw new Error("Research task tidak ditemukan.");

  if (task.approvalStatus === "pending") {
    return { taskId, status: "blocked", reason: "awaiting_human_approval" };
  }
  if (task.status !== "queued" && task.status !== "retrying") {
    return { taskId, status: "blocked", reason: `task_not_executable_from_${task.status}` };
  }

  const capabilities = parseStoredTaskCapabilities(task.requiredCapabilities);
  if (capabilities.length === 0) {
    await transitionResearchTask(userId, task.id, "failed", { error: "task_has_no_required_capability" }, task.revision);
    return { taskId, status: "failed", reason: "task_has_no_required_capability" };
  }

  const capability = capabilities[0];
  const inputs = (() => {
    try { return JSON.parse(task.inputs) as Record<string, unknown>; } catch { return {}; }
  })();
  const target = typeof inputs.target === "string" ? inputs.target : typeof inputs.hostname === "string" ? inputs.hostname : undefined;
  const assetId = typeof inputs.assetId === "number" ? inputs.assetId : undefined;
  const mode = task.riskClass === "high" || task.riskClass === "critical" ? "active_nondestructive" : "passive_readonly";

  await transitionResearchTask(userId, task.id, "running", { startedCapability: capability }, task.revision);
  const execution = await executeGovernedCapability({
    userId,
    workspaceId: task.workspaceId,
    capability,
    mode,
    input: task.inputs,
    target,
    approvalId: task.approvalId ?? undefined,
    sessionId: task.sessionId,
    assetId,
  });

  if (execution.status === "completed") {
    await transitionResearchTask(userId, task.id, "completed", {
      executionState: execution.state,
      toolKey: execution.plan.toolKey,
      observationId: execution.observationId ?? null,
      requestId: execution.pipeline.provenance.requestId,
      rawOutputSha256: execution.pipeline.provenance.rawOutputSha256,
      normalizedEvidenceSha256: execution.pipeline.provenance.normalizedEvidenceSha256,
      correlation: execution.pipeline.correlation,
    }, (await db.select().from(researchTasks).where(and(eq(researchTasks.id, task.id), eq(researchTasks.workspaceId, task.workspaceId))).limit(1))[0]?.revision);
  } else {
    const latest = (await db.select().from(researchTasks).where(eq(researchTasks.id, task.id)).limit(1))[0];
    if (latest && latest.status === "running") {
      await transitionResearchTask(userId, task.id, "failed", { executionState: execution.state, reason: execution.status === "blocked" ? execution.reason : execution.status }, latest.revision);
    }
  }

  return { taskId, status: execution.status, execution };
}
