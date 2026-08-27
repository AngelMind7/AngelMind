import type { RehearsalResult, RehearsalTask } from "./contracts";
import { evaluatePolicy } from "./guardrails";

export function buildRehearsal(input: {
  target: string;
  allowlist: string[];
  exclusions: string[];
  safeHarbor: string;
  codeOfConduct: string;
  spentCents: number;
  budgetCents: number;
  sessionLimitMinutes: number;
}): RehearsalResult {
  const policy = evaluatePolicy({
    ...input,
    action: "scope_inventory",
    elapsedMinutes: 0,
    dryRun: true,
  });
  const tasks: RehearsalTask[] = [
    {
      id: "rehearsal-policy-review",
      title: "Parse scope, safe-harbor, and code-of-conduct records",
      action: "policy_review",
      tier: "tier1",
      estimatedMinutes: 6,
      estimatedCostCents: 18,
      simulationOnly: true,
    },
    {
      id: "rehearsal-asset-map",
      title: "Build a hypothetical asset graph from declared workspace records",
      action: "scope_inventory",
      tier: "tier1",
      estimatedMinutes: 9,
      estimatedCostCents: 24,
      simulationOnly: true,
    },
    {
      id: "rehearsal-coverage-plan",
      title: "Plan coverage and governance checkpoints without contacting the target",
      action: "coverage_plan",
      tier: "tier1",
      estimatedMinutes: 11,
      estimatedCostCents: 32,
      simulationOnly: true,
    },
  ];

  return {
    networkCalls: 0,
    toolExecutions: 0,
    taskCount: tasks.length,
    estimatedCostCents: tasks.reduce((sum, task) => sum + task.estimatedCostCents, 0),
    estimatedDurationMinutes: tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0),
    tasks,
    policy,
    checkpoint: { state: "rehearsed", version: 1, createdAt: new Date().toISOString() },
  };
}
