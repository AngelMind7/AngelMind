import { and, eq } from "drizzle-orm";
import { researchTasks } from "../drizzle/schema";
import { getDb } from "./db";
import { transitionResearchTask } from "./research-workflow";
import { executeGovernedCapability } from "./governed-execution-service";

function parseCapabilities(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  } catch {
    return [];
  }
}

function parseInputs(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export type ResearchTaskExecutionResult = {
  taskId: number;
  status: "blocked" | "completed" | "failed" | "unavailable" | "timed_out";
  reason?: string;
  execution?: Awaited<ReturnType<typeof executeGovernedCapability>>;
};

/** Bridges persisted research tasks into the governed execution boundary without bypassing policy. */
export async function executeResearchTask(userId: number, taskId: number): Promise<ResearchTaskExecutionResult> {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [task] = await db.select().from(researchTasks).where(eq(researchTasks.id, taskId)).limit(1);
  if (!task) throw new Error("Research task tidak ditemukan.");
  if (task.approvalStatus === "pending") return { taskId, status: "blocked", reason: "awaiting_human_approval" };
  if (task.status !== "queued" && task.status !== "retrying") return { taskId, status: "blocked", reason: `task_not_executable_from_${task.status}` };

  const capabilities = parseCapabilities(task.requiredCapabilities);
  if (capabilities.length === 0) {
    await transitionResearchTask(userId, task.id, "failed", { error: "task_has_no_required_capability" }, task.revision);
    return { taskId, status: "failed", reason: "task_has_no_required_capability" };
  }

  const inputs = parseInputs(task.inputs);
  const target = typeof inputs.target === "string" ? inputs.target : typeof inputs.hostname === "string" ? inputs.hostname : undefined;
  const assetId = typeof inputs.assetId === "number" ? inputs.assetId : undefined;
  const highRisk = task.riskClass === "high" || task.riskClass === "critical";
  const mode = highRisk ? "active_nondestructive" : "passive_readonly";
  const capability = capabilities[0];
  const inputApprovalId = typeof inputs.approvalId === "number" && Number.isInteger(inputs.approvalId) && inputs.approvalId > 0 ? inputs.approvalId : undefined;
  const approvalId = task.approvalId ?? inputApprovalId;

  // Approval of the persisted task is not itself the execution authorization.
  // The governed policy requires the concrete, server-recorded approvalId/context.
  // Never convert an incomplete approval record into an executable request.
  if (highRisk && !approvalId) {
    return { taskId, status: "blocked", reason: "approval_record_required" };
  }

  await transitionResearchTask(userId, task.id, "running", { startedCapability: capability }, task.revision);
  const execution = await executeGovernedCapability({
    userId,
    workspaceId: task.workspaceId,
    capability,
    mode,
    input: task.inputs,
    target,
    approvalId,
    sessionId: task.sessionId,
    assetId,
  });

  const latest = (await db.select().from(researchTasks).where(and(eq(researchTasks.id, task.id), eq(researchTasks.workspaceId, task.workspaceId))).limit(1))[0];
  if (latest?.status === "running") {
    if (execution.status === "completed") {
      await transitionResearchTask(userId, task.id, "completed", {
        executionState: execution.state,
        toolKey: execution.plan.toolKey,
        observationId: execution.observationId ?? null,
        requestId: execution.pipeline.provenance.requestId,
        rawOutputSha256: execution.pipeline.provenance.rawOutputSha256,
        normalizedEvidenceSha256: execution.pipeline.provenance.normalizedEvidenceSha256,
        correlation: execution.pipeline.correlation,
      }, latest.revision);
    } else if (execution.status === "blocked") {
      // A policy/scope block is not an execution failure. Pause the task so it
      // cannot be retried blindly and preserve the authoritative denial reason.
      await transitionResearchTask(userId, task.id, "paused", {
        executionState: execution.state,
        reason: execution.reason,
      }, latest.revision);
    } else {
      await transitionResearchTask(userId, task.id, "failed", {
        executionState: execution.state,
        reason: execution.status,
      }, latest.revision);
    }
  }
  return { taskId, status: execution.status, execution };
}
