export type RunEligibilityWorkspace = {
  status: "active" | "paused" | "archived";
  lastRunAt: Date | null;
  cooldownMinutes: number;
  spentCents: number;
  budgetCents: number;
  sessionLimitMinutes: number;
};

export function getRunEligibility(workspace: RunEligibilityWorkspace, now = Date.now()): { eligible: boolean; reason?: "workspace-not-active" | "cooldown" | "budget" | "session-limit" } {
  if (workspace.status !== "active") return { eligible: false, reason: "workspace-not-active" };
  if (workspace.budgetCents <= workspace.spentCents) return { eligible: false, reason: "budget" };
  if (workspace.sessionLimitMinutes <= 0) return { eligible: false, reason: "session-limit" };
  if (workspace.lastRunAt && now - workspace.lastRunAt.getTime() < workspace.cooldownMinutes * 60_000) return { eligible: false, reason: "cooldown" };
  return { eligible: true };
}
