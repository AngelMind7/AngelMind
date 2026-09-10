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

export function assertDistinctApprover(requestedByUserId: number, decidedByUserId: number): void {
  if (!Number.isInteger(requestedByUserId) || requestedByUserId < 1 || !Number.isInteger(decidedByUserId) || decidedByUserId < 1 || requestedByUserId === decidedByUserId) throw new Error("Tier 3 approval must be decided by a different authenticated user.");
}

export function canReviewApproval(userRole: "user" | "admin", requesterId: number, reviewerId: number, hasReviewerMembership = false): boolean {
  if (!Number.isInteger(requesterId) || requesterId < 1 || !Number.isInteger(reviewerId) || reviewerId < 1) return false;
  return (userRole === "admin" || hasReviewerMembership === true) && requesterId !== reviewerId;
}
