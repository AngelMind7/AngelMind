export type FindingWorkflowStatus = "discovered" | "triaged" | "candidate" | "reproducing" | "validated" | "reported" | "submitted" | "invalid" | "duplicate" | "inconclusive";

const transitions: Record<FindingWorkflowStatus, readonly FindingWorkflowStatus[]> = {
  discovered: ["triaged", "invalid", "duplicate"],
  triaged: ["candidate", "invalid", "duplicate", "inconclusive"],
  candidate: ["reproducing", "invalid", "duplicate", "inconclusive"],
  reproducing: ["validated", "invalid", "duplicate", "inconclusive"],
  validated: ["reported"],
  reported: [],
  submitted: [],
  invalid: [],
  duplicate: [],
  inconclusive: [],
};

export function assertFindingTransition(from: FindingWorkflowStatus, to: FindingWorkflowStatus, humanReviewApproved: boolean): void {
  if (to === "submitted") throw new Error("Submission is never available through the control plane.");
  if (!transitions[from].includes(to)) throw new Error(`Invalid finding transition: ${from} → ${to}.`);
  if (to === "reported" && !humanReviewApproved) throw new Error("A finding needs recorded human review before it can become a report draft.");
}
