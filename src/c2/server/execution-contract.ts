import type { ExecutionApproval, ExecutionRisk, ExecutionState } from "./execution-state-machine";

export type GovernedExecutionRequest = {
  userId: number;
  workspaceId: number;
  toolKey: string;
  mode:
    | "offline_artifact"
    | "passive_readonly"
    | "active_nondestructive"
    | "privileged_or_destructive";
  target?: string;
  input: string;
  approvalId?: number;
};

export type GovernedExecutionRecord = {
  requestId: string;
  userId: number;
  workspaceId: number;
  toolKey: string;
  state: ExecutionState;
  risk: ExecutionRisk;
  approval: ExecutionApproval;
  scopeDigest: string;
  target?: string;
  createdAt: string;
};

export type ExecutionDecision =
  | {
      allowed: true;
      approval: "not_required" | "approved";
      scopeDigest: string;
    }
  | {
      allowed: false;
      reason:
        | "tool_not_found"
        | "workspace_not_authorized"
        | "target_required"
        | "target_out_of_scope"
        | "target_input_mismatch"
        | "target_execution_disabled"
        | "human_approval_required"
        | "approval_not_approved"
        | "approval_workspace_mismatch"
        | "approval_action_mismatch"
        | "approval_expired"
        | "approval_context_invalid"
        | "approval_tool_mismatch"
        | "approval_mode_mismatch"
        | "approval_scope_mismatch"
        | "approval_target_missing"
        | "approval_target_mismatch";
    };

/**
 * The client never supplies an authorization decision.  This helper is kept
 * intentionally narrow so callers cannot accidentally turn a request field
 * into an execution grant.
 */
export function executionApprovalFromPolicy(
  decision: ExecutionDecision
): GovernedExecutionRecord["approval"] {
  if (!decision.allowed) return "not_required";
  return decision.approval;
}

export function createExecutionRecord(input: {
  requestId: string;
  request: GovernedExecutionRequest;
  risk: ExecutionRisk;
  scopeDigest: string;
  approval: GovernedExecutionRecord["approval"];
  state?: ExecutionState;
  now?: Date;
}): GovernedExecutionRecord {
  if (!input.requestId.trim()) throw new Error("execution_request_id_required");
  if (!input.scopeDigest.trim()) throw new Error("execution_scope_digest_required");
  if (input.request.userId <= 0 || input.request.workspaceId <= 0) {
    throw new Error("execution_identity_required");
  }
  return {
    requestId: input.requestId,
    userId: input.request.userId,
    workspaceId: input.request.workspaceId,
    toolKey: input.request.toolKey,
    state: input.state ?? "INIT",
    risk: input.risk,
    approval: input.approval,
    scopeDigest: input.scopeDigest,
    target: input.request.target,
    createdAt: (input.now ?? new Date()).toISOString(),
  };
}
