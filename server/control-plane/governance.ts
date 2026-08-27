import { classifyGovernanceTier } from "./guardrails";
import type { ActionKind } from "./contracts";

export type GovernanceRequest = {
  action: ActionKind;
  tier: "tier1" | "tier2" | "tier3";
  status: "not-required" | "pending";
  executionAuthorized: false;
};

/** Builds a governance record only; it is deliberately not an execution authorization. */
export function prepareGovernanceRequest(action: ActionKind): GovernanceRequest {
  const tier = classifyGovernanceTier(action);
  return {
    action,
    tier,
    status: tier === "tier3" ? "pending" : "not-required",
    executionAuthorized: false,
  };
}
