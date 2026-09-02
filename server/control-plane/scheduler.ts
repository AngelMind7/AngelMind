export type WorkspaceSchedulingState = {
  status: "active" | "paused" | "archived";
  lastRunAt: Date | null;
  cooldownMinutes: number;
  sessionLimitMinutes: number;
  spentCents: number;
  budgetCents: number;
};

export type ScheduledJobDefinition = {
  key: "workspace-maintenance" | "approval-expiry" | "ai-memory-retention" | "outbox-recovery";
  cadence: "hourly" | "daily" | "every-15-minutes";
  execution: "metadata-only" | "database-maintenance";
  requiresOwnerApproval: boolean;
};

export const scheduledJobDefinitions: readonly ScheduledJobDefinition[] = [
  { key: "workspace-maintenance", cadence: "hourly", execution: "metadata-only", requiresOwnerApproval: false },
  { key: "approval-expiry", cadence: "every-15-minutes", execution: "database-maintenance", requiresOwnerApproval: false },
  { key: "ai-memory-retention", cadence: "daily", execution: "database-maintenance", requiresOwnerApproval: false },
  { key: "outbox-recovery", cadence: "every-15-minutes", execution: "database-maintenance", requiresOwnerApproval: false },
];

export function getScheduledJobDefinition(key: ScheduledJobDefinition["key"]) {
  return scheduledJobDefinitions.find(job => job.key === key);
}

export function getAdministrativeCheckEligibility(workspace: WorkspaceSchedulingState, now = Date.now()): { eligible: boolean; reason?: "workspace-not-active" | "cooldown" | "budget" | "session-limit" } {
  if (workspace.status !== "active") return { eligible: false, reason: "workspace-not-active" };
  if (workspace.spentCents >= workspace.budgetCents) return { eligible: false, reason: "budget" };
  if (workspace.sessionLimitMinutes <= 0) return { eligible: false, reason: "session-limit" };
  const cooldownMs = workspace.cooldownMinutes * 60_000;
  if (workspace.lastRunAt && now - workspace.lastRunAt.getTime() < cooldownMs) return { eligible: false, reason: "cooldown" };
  return { eligible: true };
}
