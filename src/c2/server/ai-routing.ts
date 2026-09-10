export type RegisteredModel = {
  modelKey: string;
  gateway: string;
  capabilities: string[];
  contextWindow: number;
  status: "active" | "degraded" | "disabled";
  lastLatencyMs?: number | null;
  inputCostPerMillionCents: number;
  outputCostPerMillionCents: number;
  priority?: number;
};

export type ModelRouteRequirements = {
  capabilities?: string[];
  minimumContextWindow?: number;
  maxCostCentsPerMillionTokens?: number;
  allowDegraded?: boolean;
};

export type ModelRouteDecision = {
  model: RegisteredModel;
  score: number;
  reasons: string[];
};

const normalized = (value: string) => value.trim().toLowerCase();

export function selectBestRegisteredModel(models: RegisteredModel[], requirements: ModelRouteRequirements = {}): ModelRouteDecision {
  if (!Array.isArray(models) || !models.every(model => model && typeof model.modelKey === "string" && typeof model.gateway === "string" && Array.isArray(model.capabilities) && model.capabilities.every(value => typeof value === "string") && Number.isFinite(model.contextWindow) && model.contextWindow > 0 && ["active", "degraded", "disabled"].includes(model.status) && Number.isFinite(model.inputCostPerMillionCents) && model.inputCostPerMillionCents >= 0 && Number.isFinite(model.outputCostPerMillionCents) && model.outputCostPerMillionCents >= 0)) throw new Error("Registered model catalog is invalid.");
  if (!requirements || typeof requirements !== "object" || (requirements.capabilities !== undefined && (!Array.isArray(requirements.capabilities) || !requirements.capabilities.every(value => typeof value === "string"))) || (requirements.minimumContextWindow !== undefined && (!Number.isFinite(requirements.minimumContextWindow) || requirements.minimumContextWindow < 0)) || (requirements.maxCostCentsPerMillionTokens !== undefined && (!Number.isFinite(requirements.maxCostCentsPerMillionTokens) || requirements.maxCostCentsPerMillionTokens < 0))) throw new Error("Model routing requirements are invalid.");
  const required = new Set((requirements.capabilities ?? []).map(normalized).filter(Boolean));
  const maxCost = requirements.maxCostCentsPerMillionTokens ?? Number.POSITIVE_INFINITY;
  const candidates = models.filter(model => {
    if (model.status === "disabled") return false;
    if (model.status === "degraded" && !requirements.allowDegraded) return false;
    if (model.contextWindow < (requirements.minimumContextWindow ?? 0)) return false;
    if (model.inputCostPerMillionCents + model.outputCostPerMillionCents > maxCost) return false;
    const capabilities = new Set(model.capabilities.map(normalized));
    return Array.from(required).every(capability => capabilities.has(capability));
  });
  if (!candidates.length) throw new Error("No registered AI model satisfies the routing requirements.");

  const ranked = candidates.map(model => {
    const capabilities = new Set(model.capabilities.map(normalized));
    const matched = Array.from(required).filter(capability => capabilities.has(capability)).length;
    const healthScore = model.status === "active" ? 30 : 10;
    const latencyScore = Math.max(0, 20 - Math.min(20, (model.lastLatencyMs ?? 1_000) / 250));
    const costScore = Math.max(0, 20 - Math.min(20, (model.inputCostPerMillionCents + model.outputCostPerMillionCents) / 100));
    const contextScore = Math.min(10, Math.log10(Math.max(1, model.contextWindow)));
    const score = matched * 100 + healthScore + latencyScore + costScore + contextScore + (model.priority ?? 0);
    return {
      model,
      score,
      reasons: [
        `${matched}/${required.size} required capabilities matched`,
        `${model.status} health state`,
        `${model.lastLatencyMs ?? "unknown"}ms observed latency`,
        `${model.inputCostPerMillionCents + model.outputCostPerMillionCents} cents combined token cost`,
      ],
    };
  });
  return ranked.sort((a, b) => b.score - a.score || a.model.modelKey.localeCompare(b.model.modelKey))[0];
}
