export type FindingWorkflowStatus =
  | "discovered"
  | "triaged"
  | "candidate"
  | "reproducing"
  | "validated"
  | "reported"
  | "notified"
  | "remediation"
  | "retest"
  | "resolved"
  | "reopened"
  | "false_positive"
  | "submitted"
  | "invalid"
  | "duplicate"
  | "inconclusive";

const transitions: Record<FindingWorkflowStatus, readonly FindingWorkflowStatus[]> = {
  discovered: ["triaged", "false_positive", "duplicate", "invalid"],
  triaged: ["candidate", "false_positive", "duplicate", "inconclusive"],
  candidate: ["reproducing", "false_positive", "duplicate", "inconclusive"],
  reproducing: ["validated", "false_positive", "duplicate", "inconclusive"],
  validated: ["reported", "remediation", "false_positive"],
  reported: ["notified", "remediation", "false_positive"],
  notified: ["remediation", "false_positive"],
  remediation: ["retest", "false_positive"],
  retest: ["resolved", "remediation", "inconclusive"],
  resolved: ["reopened"],
  reopened: ["reproducing", "remediation", "false_positive"],
  false_positive: ["reopened"],
  submitted: [],
  invalid: [],
  duplicate: [],
  inconclusive: ["reopened", "remediation"],
};

export function assertFindingTransition(
  from: FindingWorkflowStatus,
  to: FindingWorkflowStatus,
  humanReviewApproved: boolean,
): void {
  if (to === "submitted") {
    throw new Error("Submission is never available through the control plane.");
  }
  if (!transitions[from].includes(to)) {
    throw new Error(`Invalid finding transition: ${from} → ${to}.`);
  }
  if (to === "reported" && !humanReviewApproved) {
    throw new Error("A finding needs recorded human review before it can become a report draft.");
  }
}

export function isFindingTerminal(status: FindingWorkflowStatus): boolean {
  return ["resolved", "false_positive", "invalid", "duplicate"].includes(status);
}
