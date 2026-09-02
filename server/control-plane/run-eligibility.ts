export type RunEligibilityWorkspace = {
  status: "active" | "paused" | "archived";
  lastRunAt: Date | null;
  cooldownMinutes: number;
  spentCents: number;
  budgetCents: number;
  sessionLimitMinutes: number;
};

export function getRunEligibility(workspace: RunEligibilityWorkspace, now = Date.now()): { eligible: boolean; reason?: "workspace-not-active" | "cooldown" | "budget" | "session-limit" } {
  if (!Number.isFinite(now)) now = Date.now();
  if (workspace.status !== "active") return { eligible: false, reason: "workspace-not-active" };
  if (!Number.isFinite(workspace.budgetCents) || !Number.isFinite(workspace.spentCents) || workspace.budgetCents <= workspace.spentCents) return { eligible: false, reason: "budget" };
  if (!Number.isFinite(workspace.sessionLimitMinutes) || workspace.sessionLimitMinutes <= 0) return { eligible: false, reason: "session-limit" };
  const cooldownMinutes = Number.isFinite(workspace.cooldownMinutes) ? Math.max(0, workspace.cooldownMinutes) : 0;
  if (workspace.lastRunAt && Number.isFinite(workspace.lastRunAt.getTime()) && now - workspace.lastRunAt.getTime() < cooldownMinutes * 60_000) return { eligible: false, reason: "cooldown" };
  return { eligible: true };
}
