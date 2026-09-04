import { getToolCatalogEntry, type ToolRiskClass } from "./tool-catalog";
import { resolveCapability } from "./master-capability-registry";

export type ExecutionDisposition = "ALLOW" | "REQUIRE_APPROVAL" | "DENY";

export type ExecutionPlanInput = {
  capability: string;
  mode: "offline_artifact" | "passive_readonly" | "active_nondestructive" | "privileged_or_destructive";
  scopeValidated: boolean;
  humanApproval: boolean;
};

export type ExecutionPlan = {
  capability: string;
  toolKey: string;
  fallbackToolKey?: string;
  riskClass: ToolRiskClass;
  disposition: ExecutionDisposition;
  requiresApproval: boolean;
};

function dispositionFor(riskClass: ToolRiskClass, input: ExecutionPlanInput): ExecutionDisposition {
  if (!input.scopeValidated) return "DENY";
  if (riskClass === "high" || riskClass === "critical") {
    return input.humanApproval ? "ALLOW" : "REQUIRE_APPROVAL";
  }
  return "ALLOW";
}

/**
 * Resolves a master capability to its canonical adapter/fallback and applies
 * the same fail-closed risk semantics used by the governed runtime boundary.
 * This planner never executes a tool and never treats AI output as authority.
 */
export function planCapabilityExecution(input: ExecutionPlanInput): ExecutionPlan | { disposition: "DENY"; reason: string } {
  const capability = input.capability.trim();
  if (!capability) return { disposition: "DENY", reason: "capability_required" };

  const resolved = resolveCapability(capability);
  if (!resolved) return { disposition: "DENY", reason: "capability_not_found" };

  const primary = getToolCatalogEntry(resolved.primaryAdapter);
  if (!primary) return { disposition: "DENY", reason: "primary_tool_not_registered" };

  const fallback = resolved.fallbackAdapter ? getToolCatalogEntry(resolved.fallbackAdapter) : undefined;
  const disposition = dispositionFor(primary.riskClass, input);

  return {
    capability,
    toolKey: resolved.primaryAdapter,
    fallbackToolKey: fallback ? resolved.fallbackAdapter : undefined,
    riskClass: primary.riskClass,
    disposition,
    requiresApproval: primary.riskClass === "high" || primary.riskClass === "critical",
  };
}

export function shouldUseFallback(plan: ExecutionPlan, primaryAvailable: boolean, fallbackAvailable: boolean): boolean {
  return plan.disposition === "ALLOW" && !primaryAvailable && Boolean(plan.fallbackToolKey) && fallbackAvailable;
}
