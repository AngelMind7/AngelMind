import { getToolCatalogEntry } from "./tool-catalog";
import { resolveCapability } from "./master-capability-registry";
import { authorizeToolExecution } from "./tool-execution-policy";
import { executeToolPipeline, persistToolPipelineObservation, type ToolExecutionPipelineResult } from "./tool-execution-pipeline";
import { advanceExecution, canonicalExecutionPath, type ExecutionRisk, type ExecutionState } from "./execution-state-machine";
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
  riskClass: ExecutionRisk;
  selectedToolAvailable: boolean;
  fallbackAvailable: boolean;
  states: readonly ExecutionState[];
};

export type GovernedExecutionResult =
  | { status: "blocked"; reason: string; plan: GovernedExecutionPlan | null; state: ExecutionState }
  | { status: "completed" | "failed" | "unavailable" | "timed_out"; plan: GovernedExecutionPlan; pipeline: ToolExecutionPipelineResult; observationId?: number; state: ExecutionState };

function adapterIsHealthy(health: Awaited<ReturnType<typeof checkRegisteredAdapterHealth>>, toolKey: string) {
  return health.some(item => item.toolKey === toolKey && item.available === true);
}

function stateBeforeExecution(risk: ExecutionRisk, scopeValidated: boolean, humanApproval: boolean): ExecutionState {
  let context = { state: "INIT" as ExecutionState, risk, scopeValidated, approval: humanApproval ? "approved" as const : "not_required" as const };
  for (const _ of ["RECON", "FINGERPRINT", "VECTOR_SELECTION", "POLICY_CHECK", "APPROVAL_GATE", "QUEUE"] as const) {
    context = advanceExecution(context);
    if (context.state === "APPROVAL_GATE" && !humanApproval && (risk === "high" || risk === "critical")) return context.state;
  }
  return context.state;
}

/** Capability-driven execution boundary. Authorization remains the final authority. */
export async function executeGovernedCapability(input: GovernedExecutionInput): Promise<GovernedExecutionResult> {
  const capability = input.capability.trim();
  const resolved = resolveCapability(capability);
  if (!resolved) return { status: "blocked", reason: "capability_not_found", plan: null, state: "VECTOR_SELECTION" };

  const primary = getToolCatalogEntry(resolved.primaryAdapter);
  if (!primary) return { status: "blocked", reason: "primary_tool_not_registered", plan: null, state: "VECTOR_SELECTION" };
  const fallback = resolved.fallbackAdapter ? getToolCatalogEntry(resolved.fallbackAdapter) : undefined;
  const health = await checkRegisteredAdapterHealth();
  const primaryAvailable = adapterIsHealthy(health, primary.toolKey);
  const fallbackAvailable = fallback ? adapterIsHealthy(health, fallback.toolKey) : false;
  const selectedTool = primaryAvailable ? primary : fallbackAvailable && fallback ? fallback : primary;

  const plan: GovernedExecutionPlan = {
    capability,
    toolKey: selectedTool.toolKey,
    fallbackToolKey: selectedTool.toolKey === primary.toolKey ? fallback?.toolKey : primary.toolKey,
    riskClass: selectedTool.riskClass as ExecutionRisk,
    selectedToolAvailable: primaryAvailable || fallbackAvailable,
    fallbackAvailable,
    states: canonicalExecutionPath(),
  };
  if (!plan.selectedToolAvailable) return { status: "blocked", reason: "no_healthy_tool_adapter", plan, state: "FINGERPRINT" };

  const authorization = await authorizeToolExecution({
    userId: input.userId,
    workspaceId: input.workspaceId,
    toolKey: plan.toolKey,
    mode: input.mode,
    target: input.target,
    input: input.input,
    approvalId: input.approvalId,
  });
  if (!authorization.allowed) {
    return { status: "blocked", reason: authorization.reason, plan, state: stateBeforeExecution(plan.riskClass, false, false) };
  }

  const runtimeRequest = {
    toolKey: plan.toolKey,
    mode: input.mode,
    input: input.input,
    scopeValidated: true,
    humanApproval: authorization.humanApproval,
    capabilities: [capability],
  };
  const pipeline = await executeToolPipeline(runtimeRequest);
  let observationId: number | undefined;
  if (input.sessionId && pipeline.runtime.status === "completed") {
    const observation = await persistToolPipelineObservation(
      input.userId,
      { sessionId: input.sessionId, assetId: input.assetId, request: runtimeRequest },
      pipeline
    );
    observationId = observation.id;
  }
  const executionState = pipeline.runtime.status === "completed" ? "OBSERVATION" : "WORKER_EXECUTION";
  return { status: pipeline.runtime.status, plan, pipeline, observationId, state: executionState };
}
