export const EXECUTION_STATES = [
  "INIT",
  "RECON",
  "FINGERPRINT",
  "VECTOR_SELECTION",
  "POLICY_CHECK",
  "APPROVAL_GATE",
  "QUEUE",
  "WORKER_EXECUTION",
  "PARSER",
  "NORMALIZER",
  "OBSERVATION",
  "EVIDENCE",
  "FINDING",
  "CORRELATION",
  "CHAIN_VALIDATION",
  "IMPACT_PROOF",
  "REPORT_GENERATION",
  "SUBMISSION",
  "DONE",
] as const;

export type ExecutionState = (typeof EXECUTION_STATES)[number];

const NEXT_STATE: Record<ExecutionState, ExecutionState | null> = {
  INIT: "RECON",
  RECON: "FINGERPRINT",
  FINGERPRINT: "VECTOR_SELECTION",
  VECTOR_SELECTION: "POLICY_CHECK",
  POLICY_CHECK: "APPROVAL_GATE",
  APPROVAL_GATE: "QUEUE",
  QUEUE: "WORKER_EXECUTION",
  WORKER_EXECUTION: "PARSER",
  PARSER: "NORMALIZER",
  NORMALIZER: "OBSERVATION",
  OBSERVATION: "EVIDENCE",
  EVIDENCE: "FINDING",
  FINDING: "CORRELATION",
  CORRELATION: "CHAIN_VALIDATION",
  CHAIN_VALIDATION: "IMPACT_PROOF",
  IMPACT_PROOF: "REPORT_GENERATION",
  REPORT_GENERATION: "SUBMISSION",
  SUBMISSION: "DONE",
  DONE: null,
};

export type ExecutionRisk = "low" | "medium" | "high" | "critical";
export type ExecutionApproval = "not_required" | "pending" | "approved" | "rejected";

export type ExecutionContext = {
  state: ExecutionState;
  risk: ExecutionRisk;
  scopeValidated: boolean;
  approval: ExecutionApproval;
};

export type TransitionResult =
  | { allowed: true; from: ExecutionState; to: ExecutionState }
  | { allowed: false; reason: string };

export function requiresApproval(risk: ExecutionRisk) {
  return risk === "high" || risk === "critical";
}

export function transitionExecution(context: ExecutionContext): TransitionResult {
  const next = NEXT_STATE[context.state];
  if (!next) return { allowed: false, reason: "execution_already_done" };

  if (context.state === "POLICY_CHECK" && !context.scopeValidated) {
    return { allowed: false, reason: "scope_validation_required" };
  }

  if (context.state === "APPROVAL_GATE") {
    if (!requiresApproval(context.risk)) {
      return { allowed: true, from: context.state, to: next };
    }
    if (context.approval === "pending") {
      return { allowed: false, reason: "awaiting_human_approval" };
    }
    if (context.approval !== "approved") {
      return { allowed: false, reason: "human_approval_required" };
    }
  }

  return { allowed: true, from: context.state, to: next };
}

export function advanceExecution(context: ExecutionContext): ExecutionContext {
  const result = transitionExecution(context);
  if (!result.allowed) return context;
  return { ...context, state: result.to };
}

export function isTerminalExecutionState(state: ExecutionState) {
  return state === "DONE";
}

export function canonicalExecutionPath(): readonly ExecutionState[] {
  return EXECUTION_STATES;
}
