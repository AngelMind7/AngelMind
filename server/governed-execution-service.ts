import { createHash } from "node:crypto";
import { getToolCatalogEntry } from "./tool-catalog";
import { resolveCapability } from "./master-capability-registry";
import { authorizeToolExecution } from "./tool-execution-policy";
import { executeToolPipeline, persistToolPipelineObservation, type ToolExecutionPipelineResult } from "./tool-execution-pipeline";
import { advanceExecution, canonicalExecutionPath, type ExecutionRisk, type ExecutionState } from "./execution-state-machine";
import { checkRegisteredAdapterHealth } from "./tool-runtime";
import { createExecutionLedger, advanceExecutionLedger, getExecutionLedger, persistExecutionReport, completeExecutionLedger, failExecutionLedger } from "./execution-ledger";
import { generateExecutionReport, type ExecutionReport } from "./execution-assurance";
import * as controlPlane from "./control-plane/service";

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
  | { status: "completed" | "failed" | "unavailable" | "timed_out" | "blocked"; plan: GovernedExecutionPlan; pipeline: ToolExecutionPipelineResult; observationId?: number; findingId?: number; report?: ExecutionReport; state: ExecutionState };

function adapterIsHealthy(health: Awaited<ReturnType<typeof checkRegisteredAdapterHealth>>, toolKey: string) {
  return health.some(item => item.toolKey === toolKey && item.available === true);
}

function stateBeforeExecution(risk: ExecutionRisk, scopeValidated: boolean, humanApproval: boolean): ExecutionState {
  let context = { state: "INIT" as ExecutionState, risk, scopeValidated, approval: humanApproval ? "approved" as const : "not_required" as const };
  for (const _ of ["RECON", "FINGERPRINT", "VECTOR_SELECTION", "POLICY_CHECK", "APPROVAL_GATE", "QUEUE"] as const) {
    const previous = context.state;
    context = advanceExecution(context);
    if (context.state === previous) return context.state;
    if (context.state === "APPROVAL_GATE" && !humanApproval && (risk === "high" || risk === "critical")) return context.state;
  }
  return context.state;
}

async function advanceLedgerTo(userId: number, jobId: number, target: ExecutionState) {
  let guard = 0;
  while (guard++ < canonicalExecutionPath().length) {
    const ledger = await getExecutionLedger(userId, jobId);
    if (ledger.payload.state === target) return ledger.payload.state;
    if (ledger.payload.state === "DONE") throw new Error(`Execution ledger cannot advance past DONE to ${target}.`);
    const before = ledger.payload.state;
    await advanceExecutionLedger(userId, jobId);
    const after = (await getExecutionLedger(userId, jobId)).payload.state;
    if (after === before) throw new Error(`Execution ledger stalled at ${before}.`);
  }
  throw new Error(`Execution ledger could not reach ${target}.`);
}

function findingSeverity(result: ToolExecutionPipelineResult): "informational" | "low" | "medium" | "high" | "critical" {
  if (result.correlation?.criticalEscalation) return "critical";
  const priority = result.correlation?.matches[0]?.priority ?? 0;
  if (priority >= 80) return "high";
  if (priority >= 50) return "medium";
  if (priority >= 20) return "low";
  return "informational";
}

async function promoteCorrelationFinding(input: GovernedExecutionInput, pipeline: ToolExecutionPipelineResult, observationId?: number) {
  if (!pipeline.correlation || pipeline.correlation.matches.length === 0) return undefined;
  const match = pipeline.correlation.matches[0];
  const fingerprint = createHash("sha256").update(JSON.stringify({ workspaceId: input.workspaceId, capability: input.capability, emittedKey: match.emittedKey, evidenceRefs: match.evidenceRefs })).digest("hex");
  const evidenceRefs = Array.from(new Set([...match.evidenceRefs, pipeline.provenance.requestId, ...(observationId ? [`observation:${observationId}`] : [])]));
  const severity = findingSeverity(pipeline);
  const reportDraft = JSON.stringify({ source: "governed-execution", capability: input.capability, toolKey: pipeline.provenance.toolKey, requestId: pipeline.provenance.requestId, ruleId: match.ruleId, emittedKey: match.emittedKey, evidenceRefs, severity, confidence: match.confidence, rawOutputSha256: pipeline.provenance.rawOutputSha256, normalizedEvidenceSha256: pipeline.provenance.normalizedEvidenceSha256 });
  try {
    await controlPlane.createFinding(input.userId, { workspaceId: input.workspaceId, fingerprint, title: match.title, impactSummary: `Correlation ${match.emittedKey} matched by governed capability ${input.capability}. Evidence references: ${evidenceRefs.join(", ")}.`, reportDraft, confidence: match.confidence, severity });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.toLowerCase().includes("fingerprint")) throw error;
    const existing = await controlPlane.listFindings(input.userId, input.workspaceId);
    return existing.find(item => item.fingerprint === fingerprint)?.id;
  }
  const findings = await controlPlane.listFindings(input.userId, input.workspaceId);
  return findings.find(item => item.fingerprint === fingerprint)?.id;
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
  const plan: GovernedExecutionPlan = { capability, toolKey: selectedTool.toolKey, fallbackToolKey: selectedTool.toolKey === primary.toolKey ? fallback?.toolKey : primary.toolKey, riskClass: selectedTool.riskClass as ExecutionRisk, selectedToolAvailable: primaryAvailable || fallbackAvailable, fallbackAvailable, states: canonicalExecutionPath() };
  if (!plan.selectedToolAvailable) return { status: "blocked", reason: "no_healthy_tool_adapter", plan, state: "FINGERPRINT" };

  const authorization = await authorizeToolExecution({ userId: input.userId, workspaceId: input.workspaceId, toolKey: plan.toolKey, mode: input.mode, target: input.target, input: input.input, approvalId: input.approvalId });
  if (!authorization.allowed) return { status: "blocked", reason: authorization.reason, plan, state: stateBeforeExecution(plan.riskClass, false, false) };

  const ledgerRequestId = createHash("sha256").update(JSON.stringify({ userId: input.userId, workspaceId: input.workspaceId, capability, toolKey: plan.toolKey, mode: input.mode, input: input.input, target: input.target ?? null, sessionId: input.sessionId ?? null, assetId: input.assetId ?? null, createdAt: new Date().toISOString() })).digest("hex");
  const ledger = await createExecutionLedger(input.userId, { workspaceId: input.workspaceId, capability, toolKey: plan.toolKey, risk: plan.riskClass, scopeValidated: true, approval: authorization.humanApproval ? "approved" : "not_required", requestId: ledgerRequestId });
  try {
    await advanceLedgerTo(input.userId, ledger.jobId, "QUEUE");
    const runtimeRequest = { toolKey: plan.toolKey, mode: input.mode, input: input.input, scopeValidated: true, humanApproval: authorization.humanApproval, capabilities: [capability] };
    await advanceLedgerTo(input.userId, ledger.jobId, "WORKER_EXECUTION");
    const pipeline = await executeToolPipeline(runtimeRequest);
    await advanceLedgerTo(input.userId, ledger.jobId, "PARSER");
    await advanceLedgerTo(input.userId, ledger.jobId, "NORMALIZER");

    let observationId: number | undefined;
    let findingId: number | undefined;
    let report: ExecutionReport | undefined;
    if (input.sessionId && pipeline.runtime.status === "completed") {
      const observation = await persistToolPipelineObservation(input.userId, { sessionId: input.sessionId, assetId: input.assetId, request: runtimeRequest }, pipeline);
      observationId = observation.id;
    }
    if (pipeline.runtime.status === "completed") {
      await advanceLedgerTo(input.userId, ledger.jobId, "OBSERVATION");
      await advanceLedgerTo(input.userId, ledger.jobId, "EVIDENCE");
      findingId = await promoteCorrelationFinding(input, pipeline, observationId);
      if (findingId && pipeline.correlation) {
        const match = pipeline.correlation.matches[0];
        const evidenceRefs = Array.from(new Set([...match.evidenceRefs, pipeline.provenance.requestId, ...(observationId ? [`observation:${observationId}`] : [])]));
        report = generateExecutionReport({
          capability,
          evidence: { requestId: pipeline.provenance.requestId, toolKey: pipeline.provenance.toolKey, rawOutputSha256: pipeline.provenance.rawOutputSha256, normalizedEvidenceSha256: pipeline.provenance.normalizedEvidenceSha256, evidenceRefs },
          finding: { findingId, ruleId: match.ruleId, emittedKey: match.emittedKey, title: match.title, severity: findingSeverity(pipeline), confidence: match.confidence, evidenceRefs },
        }) ?? undefined;
        if (report) {
          await advanceLedgerTo(input.userId, ledger.jobId, "FINDING");
          await advanceLedgerTo(input.userId, ledger.jobId, "CORRELATION");
          await advanceLedgerTo(input.userId, ledger.jobId, "CHAIN_VALIDATION");
          await advanceLedgerTo(input.userId, ledger.jobId, "IMPACT_PROOF");
          await advanceLedgerTo(input.userId, ledger.jobId, "REPORT_GENERATION");
          await persistExecutionReport(input.userId, ledger.jobId, report as unknown as Record<string, unknown>);
        }
      }
      if (!report) await completeExecutionLedger(input.userId, ledger.jobId, findingId ? "correlation_completed_without_report" : "execution_completed_without_finding");
    } else {
      await failExecutionLedger(input.userId, ledger.jobId, pipeline.runtime.reason ?? `runtime_${pipeline.runtime.status}`);
    }
    const executionState = report ? "REPORT_GENERATION" : pipeline.runtime.status === "completed" ? (findingId ? "CORRELATION" : "EVIDENCE") : "WORKER_EXECUTION";
    return { status: pipeline.runtime.status, plan, pipeline, observationId, findingId, report, state: executionState };
  } catch (error) {
    try { await failExecutionLedger(input.userId, ledger.jobId, error instanceof Error ? error.message : "governed_execution_failed"); } catch { /* preserve original execution error */ }
    throw error;
  }
}
