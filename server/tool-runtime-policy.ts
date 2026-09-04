import type { ToolRiskClass } from "./tool-catalog";
import type { ToolRuntimeRequest } from "./tool-runtime";

export type RuntimePackId =
  | "artifact-pack"
  | "analysis-pack"
  | "passive-pack"
  | "review-required-pack";

/**
 * Resolve the execution pack from the requested runtime mode and risk.
 * Privileged/destructive execution is never allowed to fall back to the
 * ordinary artifact pack.
 */
export function runtimePackForRequest(
  mode: ToolRuntimeRequest["mode"],
  riskClass: ToolRiskClass
): RuntimePackId {
  if (mode === "passive_readonly") return "passive-pack";
  if (
    mode === "privileged_or_destructive" ||
    riskClass === "high" ||
    riskClass === "critical"
  ) {
    return "review-required-pack";
  }
  return "artifact-pack";
}

export function isTargetExecutionMode(mode: ToolRuntimeRequest["mode"]) {
  return mode === "active_nondestructive" || mode === "privileged_or_destructive";
}

export function requiresHumanApproval(
  mode: ToolRuntimeRequest["mode"],
  riskClass: ToolRiskClass
) {
  return (
    riskClass === "high" ||
    riskClass === "critical" ||
    mode === "privileged_or_destructive"
  );
}

export function assertRuntimePolicy(input: {
  mode: ToolRuntimeRequest["mode"];
  riskClass: ToolRiskClass;
  scopeValidated: boolean;
  humanApproval: boolean;
  targetExecutionEnabled: boolean;
}) {
  if (!input.scopeValidated) return { allowed: false as const, reason: "scope_not_validated" as const };
  if (requiresHumanApproval(input.mode, input.riskClass) && !input.humanApproval) {
    return { allowed: false as const, reason: "human_approval_required" as const };
  }
  if (isTargetExecutionMode(input.mode) && !input.targetExecutionEnabled) {
    return { allowed: false as const, reason: "target_execution_disabled" as const };
  }
  if (
    input.mode === "privileged_or_destructive" &&
    input.riskClass !== "critical"
  ) {
    return { allowed: false as const, reason: "privileged_mode_blocked" as const };
  }
  return {
    allowed: true as const,
    runtimePack: runtimePackForRequest(input.mode, input.riskClass),
  };
}
