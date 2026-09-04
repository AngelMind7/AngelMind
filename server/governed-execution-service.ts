import { getToolCatalogEntry } from "./tool-catalog";
import { resolveCapability } from "./master-capability-registry";
import { authorizeToolExecution } from "./tool-execution-policy";
import { executeToolPipeline, type ToolExecutionPipelineResult } from "./tool-execution-pipeline";
import { canonicalExecutionPath, type ExecutionState } from "./execution-state-machine";
import { checkRegisteredAdapterHealth } from "./tool-runtime";

export type GovernedExecutionInput = {
  userId: number;
  workspaceId: number;
  capability: string;
  mode: "offline_artifact" | "passive_readonly" | "active_nondestructive" | "privileged_or_destructive";
  input: string;
  target?: string;
  approvalId?: number;
  sessionId?: number;
  assetId?: number;
};

export type GovernedExecutionPlan = {
  capability: string;
  toolKey: string;
  fallbackToolKey?: string;
  riskClass: "low" | "medium" | "high" | "critical" | "unknown";
  selectedToolAvailable: boolean;
  fallbackAvailable: boolean;
  states: readonly ExecutionState[];
};

export type GovernedExecutionResult =
  | { status: "blocked"; reason: string; plan: GovernedExecutionPlan | null }
  | { status: "completed" | "failed" | "unavailable" | "timed_out"; plan: GovernedExecutionPlan; pipeline: ToolExecutionPipelineResult };

function adapterIsHealthy(health: Awaited<ReturnType<typeof checkRegisteredAdapterHealth>>, toolKey: string) {
  return health.some(item => item.toolKey === toolKey && item.available === true);
}

/**
 * Capability-driven execution boundary. This service deliberately performs
 * planning/health discovery before authorization, then authorizes the exact
 * selected tool immediately before execution. The router must not bypass it.
 */
export async function executeGovernedCapability(input: GovernedExecutionInput): Promise<GovernedExecutionResult> {
  const capability = input.capability.trim();
  const resolved = resolveCapability(capability);
  if (!resolved) return { status: "blocked", reason: "capability_not_found", plan: null };

  const primary = getToolCatalogEntry(resolved.primaryAdapter);
  if (!primary) return { status: "blocked", reason: "primary_tool_not_registered", plan: null };
  const fallback = resolved.fallbackAdapter ? getToolCatalogEntry(resolved.fallbackAdapter) : undefined;
  const health = await checkRegisteredAdapterHealth();
  const primaryAvailable = adapterIsHealthy(health, primary.toolKey);
  const fallbackAvailable = fallback ? adapterIsHealthy(health, fallback.toolKey) : false;
  const selectedTool = primaryAvailable || !fallbackAvailable ? primary : fallback!;

  const plan: GovernedExecutionPlan = {
    capability,
    toolKey: selectedTool.toolKey,
    fallbackToolKey: selectedTool.toolKey === primary.toolKey ? fallback?.toolKey : primary.toolKey,
    riskClass: selectedTool.riskClass,
    selectedToolAvailable: primaryAvailable || fallbackAvailable,
    fallbackAvailable,
    states: canonicalExecutionPath(),
  };

  if (!plan.selectedToolAvailable) return { status: "blocked", reason: "no_healthy_tool_adapter", plan };

  const authorization = await authorizeToolExecution({
    userId: input.userId,
    workspaceId: input.workspaceId,
    toolKey: plan.toolKey,
    mode: input.mode,
    target: input.target,
    input: input.input,
    approvalId: input.approvalId,
  });
  if (!authorization.allowed) return { status: "blocked", reason: authorization.reason, plan };

  const pipeline = await executeToolPipeline({
    userId: input.userId,
    workspaceId: input.workspaceId,
    toolKey: plan.toolKey,
    mode: input.mode,
    target: input.target,
    input: input.input,
    scopeValidated: true,
    humanApproval: authorization.humanApproval,
    capabilities: [capability],
  });

  return { status: pipeline.runtime.status, plan, pipeline };
}
