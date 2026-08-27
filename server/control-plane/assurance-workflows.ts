import { buildPolicyDiff, type PolicySnapshot } from "./assurance-contracts";

export function preparePolicyVersionWorkflow(previous: PolicySnapshot, candidate: PolicySnapshot, latestVersion: number, requestedByUserId: number, changeSummary: string) {
  const diff = buildPolicyDiff(previous, candidate);
  if (Object.keys(diff).length === 0) throw new Error("Policy candidate does not change any controlled field.");
  return { version: latestVersion + 1, status: "pending" as const, requestedByUserId, changeSummary: changeSummary.trim() || "Policy review requested.", diff };
}

export function applyPolicyDecisionWorkflow(status: "pending" | "approved" | "rejected" | "superseded", requesterId: number, reviewerId: number, isEligibleReviewer: boolean, decision: "approved" | "rejected") {
  if (status !== "pending") throw new Error("Policy version is not pending.");
  if (!isEligibleReviewer || requesterId === reviewerId) throw new Error("Policy change requires a distinct eligible reviewer.");
  return { status: decision, activePolicyUpdated: decision === "approved" } as const;
}

export function transitionIncidentWorkflow(status: "open" | "acknowledged" | "resolved", action: "acknowledge" | "resolve") {
  if (action === "acknowledge" && status !== "open") throw new Error("Only open incidents can be acknowledged.");
  if (action === "resolve" && status === "resolved") throw new Error("Incident already resolved.");
  return action === "acknowledge" ? "acknowledged" as const : "resolved" as const;
}

export function shouldEscalateIncident(status: "open" | "acknowledged" | "resolved", escalationDueAt: Date, escalatedAt: Date | null, now = new Date()): boolean {
  return status !== "resolved" && escalatedAt === null && escalationDueAt.getTime() < now.getTime();
}

export function prepareWebhookActivationWorkflow(readinessValid: boolean, existingPendingRequest: boolean, requesterId: number) {
  if (!readinessValid) throw new Error("Webhook draft is not ready for review.");
  if (existingPendingRequest) throw new Error("A webhook activation review is already pending.");
  return { status: "pending" as const, requestedByUserId: requesterId, outboundDeliveryEnabled: false as const };
}

export function applyWebhookReviewWorkflow(status: "pending" | "approved" | "rejected", requesterId: number, reviewerId: number, isEligibleReviewer: boolean, decision: "approved" | "rejected") {
  if (status !== "pending") throw new Error("Webhook activation request is not pending.");
  if (!isEligibleReviewer || requesterId === reviewerId) throw new Error("Webhook activation requires a distinct eligible reviewer.");
  return { status: decision, outboundDeliveryEnabled: false as const };
}
