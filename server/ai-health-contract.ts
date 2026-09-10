export type HealthModel = { modelKey: string; provider: string; status: "active" | "degraded" | "disabled"; lastHealthCheckAt?: string | Date | null; lastLatencyMs?: number | null; lastErrorCode?: string | null };

export function evaluateModelHealth(model: HealthModel, now = new Date(), maxAgeMs = 5 * 60_000) {
  if (!Number.isFinite(maxAgeMs) || maxAgeMs < 1_000) throw new Error("Health freshness window is invalid.");
  const checkedAt = model.lastHealthCheckAt ? new Date(model.lastHealthCheckAt).getTime() : 0;
  const stale = checkedAt === 0 || now.getTime() - checkedAt > maxAgeMs;
  const effectiveStatus = model.status === "disabled" ? "disabled" : stale ? "stale" : model.status;
  return { modelKey: model.modelKey, provider: model.provider, configuredStatus: model.status, effectiveStatus, stale, usableForNewRuns: effectiveStatus === "active", failClosedReason: effectiveStatus === "active" ? null : `model_${effectiveStatus}` } as const;
}

export function chooseHealthFallback(models: HealthModel[], now = new Date()) {
  const evaluated = models.map(model => evaluateModelHealth(model, now)).filter(model => model.usableForNewRuns);
  return evaluated.sort((a, b) => a.modelKey.localeCompare(b.modelKey))[0] ?? null;
}
