export type WorkspaceSchedulingState = {
  status: "active" | "paused" | "archived";
  lastRunAt: Date | null;
  cooldownMinutes: number;
  sessionLimitMinutes: number;
  spentCents: number;
  budgetCents: number;
};

export function getAdministrativeCheckEligibility(workspace: WorkspaceSchedulingState, now = Date.now()): { eligible: boolean; reason?: "workspace-not-active" | "cooldown" | "budget" | "session-limit" } {
  if (workspace.status !== "active") return { eligible: false, reason: "workspace-not-active" };
  if (workspace.spentCents >= workspace.budgetCents) return { eligible: false, reason: "budget" };
  if (workspace.sessionLimitMinutes <= 0) return { eligible: false, reason: "session-limit" };
  const cooldownMs = workspace.cooldownMinutes * 60_000;
  if (workspace.lastRunAt && now - workspace.lastRunAt.getTime() < cooldownMs) return { eligible: false, reason: "cooldown" };
  return { eligible: true };
}
