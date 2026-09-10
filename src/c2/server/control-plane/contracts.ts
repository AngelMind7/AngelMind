export type GovernanceTier = "tier1" | "tier2" | "tier3";

export type ActionKind =
  | "policy_review"
  | "scope_inventory"
  | "coverage_plan"
  | "authenticated_validation"
  | "privileged_proof"
  | "denial_of_service"
  | "social_engineering"
  | "data_exfiltration";

export type PolicyDecision = {
  allowed: boolean;
  tier: GovernanceTier;
  networkAllowed: boolean;
  reasons: string[];
};

export type RehearsalTask = {
  id: string;
  title: string;
  action: ActionKind;
  tier: GovernanceTier;
  estimatedMinutes: number;
  estimatedCostCents: number;
  simulationOnly: true;
};

export type RehearsalResult = {
  networkCalls: 0;
  toolExecutions: 0;
  taskCount: number;
  estimatedCostCents: number;
  estimatedDurationMinutes: number;
  tasks: RehearsalTask[];
  policy: PolicyDecision;
  checkpoint: { state: "rehearsed"; version: 1; createdAt: string };
};
