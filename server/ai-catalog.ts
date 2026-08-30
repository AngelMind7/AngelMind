import { ENV } from "./_core/env";

export type GatewayModel = {
  modelKey: string;
  provider: string;
  gateway: "9router" | "omniroute";
  capabilities: string[];
  contextWindow: number;
  inputCostPerMillionCents: number;
  outputCostPerMillionCents: number;
};

function numberOr(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function normalizeModel(raw: Record<string, unknown>, gateway: GatewayModel["gateway"]): GatewayModel | null {
  const modelKey = String(raw.id ?? raw.model ?? "").trim();
  if (!modelKey) return null;
  const metadata = (raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {}) as Record<string, unknown>;
  const modalities = Array.isArray(raw.modalities) ? raw.modalities : Array.isArray(metadata.modalities) ? metadata.modalities : [];
  const capabilities = new Set<string>(["text"]);
  for (const modality of modalities) if (typeof modality === "string") capabilities.add(modality.toLowerCase());
  if (raw.vision === true || metadata.vision === true) capabilities.add("vision");
  if (raw.tools === true || raw.tool_calling === true || metadata.tools === true) capabilities.add("tools");
  const pricing = (raw.pricing && typeof raw.pricing === "object" ? raw.pricing : metadata.pricing) as Record<string, unknown> | undefined;
  return {
    modelKey,
    provider: String(raw.owned_by ?? raw.provider ?? gateway).trim() || gateway,
    gateway,
    capabilities: Array.from(capabilities).sort(),
    contextWindow: numberOr(raw.context_length ?? raw.contextWindow ?? metadata.context_length, 0),
    inputCostPerMillionCents: Math.round(numberOr(pricing?.prompt ?? pricing?.input, 0) * 100_000),
    outputCostPerMillionCents: Math.round(numberOr(pricing?.completion ?? pricing?.output, 0) * 100_000),
  };
}

async function fetchGatewayCatalog(baseUrl: string, apiKey: string, gateway: GatewayModel["gateway"]): Promise<GatewayModel[]> {
  if (!baseUrl || !apiKey) return [];
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" } });
  if (!response.ok) throw new Error(`${gateway} model catalog failed with HTTP ${response.status}`);
  const payload = await response.json() as { data?: unknown; models?: unknown };
  const rows = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.models) ? payload.models : [];
  return rows.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object")).map(row => normalizeModel(row, gateway)).filter((model): model is GatewayModel => Boolean(model));
}

export async function discoverGatewayModels() {
  const results = await Promise.allSettled([
    fetchGatewayCatalog(ENV.llmPrimaryApiUrl, ENV.llmPrimaryApiKey, "9router"),
    fetchGatewayCatalog(ENV.llmFallbackApiUrl, ENV.llmFallbackApiKey, "omniroute"),
  ]);
  return { models: results.flatMap(result => result.status === "fulfilled" ? result.value : []), errors: results.flatMap(result => result.status === "rejected" ? [result.reason instanceof Error ? result.reason.message : "catalog discovery failed"] : []) };
}
