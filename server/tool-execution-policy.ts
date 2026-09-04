import * as controlPlane from "./control-plane/service";
import { isTargetInScope } from "./control-plane/guardrails";
import {
  canExecuteTool,
  getToolCatalogEntry,
  type ToolRiskClass,
} from "./tool-catalog";
import { adapterRequiresTargetScope } from "./tool-runtime";

export type GovernedToolExecutionInput = {
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

export type GovernedToolExecutionDecision =
  | {
      allowed: true;
      scopeDigest: string;
      riskClass: ToolRiskClass;
      target?: string;
      humanApproval: boolean;
    }
  | {
      allowed: false;
      reason: string;
    };

function blocked(reason: string): GovernedToolExecutionDecision {
  return { allowed: false, reason };
}

export async function authorizeToolExecution(
  input: GovernedToolExecutionInput
): Promise<GovernedToolExecutionDecision> {
  const tool = getToolCatalogEntry(input.toolKey);
  if (!tool) return blocked("tool_not_found");

  const context = await controlPlane.getToolExecutionContext(
    input.userId,
    input.workspaceId
  );
  if (!context.allowed) {
    return blocked(
      "reason" in context && typeof context.reason === "string"
        ? context.reason
        : "execution_context_denied"
    );
  }

  const targetRequired = adapterRequiresTargetScope(input.toolKey);
  const target = input.target?.trim();
  if (targetRequired) {
    if (!target) return blocked("target_required");
    const authorizedTarget = target;
    if (
      !isTargetInScope(
        authorizedTarget,
        context.allowlist,
        context.exclusions
      )
    ) {
      return blocked("target_out_of_scope");
    }
    if (input.input.trim().toLowerCase() !== authorizedTarget.toLowerCase()) {
      return blocked("target_input_mismatch");
    }
  }

  const targetMode =
    input.mode === "active_nondestructive" ||
    input.mode === "privileged_or_destructive";
  if (targetMode && process.env.ANGELMIND_ENABLE_TARGET_EXECUTION !== "true") {
    return blocked("target_execution_disabled");
  }

  let humanApproval = false;
  if (tool.riskClass === "high" || tool.riskClass === "critical") {
    if (!input.approvalId) return blocked("human_approval_required");
    const approvals = await controlPlane.listApprovals(input.userId, "user");
    const approval = approvals.find((item) => item.id === input.approvalId);
    if (!approval || approval.status !== "approved") {
      return blocked("approval_not_approved");
    }
    if (approval.workspaceId !== input.workspaceId) {
      return blocked("approval_workspace_mismatch");
    }
    if (approval.actionName !== "privileged_proof") {
      return blocked("approval_action_mismatch");
    }
    if (approval.expiresAt && approval.expiresAt <= new Date()) {
      return blocked("approval_expired");
    }
    let approvalContext: Record<string, unknown> = {};
    try {
      approvalContext = JSON.parse(approval.contextJson ?? "{}");
    } catch {
      return blocked("approval_context_invalid");
    }
    if (
      approvalContext.toolId !== input.toolKey &&
      approvalContext.tool !== input.toolKey
    ) {
      return blocked("approval_tool_mismatch");
    }
    if (approvalContext.mode !== input.mode) {
      return blocked("approval_mode_mismatch");
    }
    if (approvalContext.scopeDigest !== context.scopeDigest) {
      return blocked("approval_scope_mismatch");
    }
    if (targetRequired) {
      if (typeof approvalContext.target !== "string") {
        return blocked("approval_target_missing");
      }
      if (approvalContext.target.toLowerCase() !== target!.toLowerCase()) {
        return blocked("approval_target_mismatch");
      }
    }
    humanApproval = true;
  }

  const decision = canExecuteTool({
    toolKey: input.toolKey,
    mode: input.mode,
    scopeValidated: true,
    humanApproval,
  });
  if (!decision.allowed) return blocked(decision.reason);

  return {
    allowed: true,
    scopeDigest: context.scopeDigest,
    riskClass: tool.riskClass,
    target,
    humanApproval,
  };
}
