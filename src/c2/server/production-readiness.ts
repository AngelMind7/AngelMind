import type { checkProviderProbes } from "./observability";
import type { checkRuntimeReadiness } from "./tool-runtime";

export const productionCapabilities = ["database", "runtime", "providers"] as const;
export type ProductionCapability = typeof productionCapabilities[number];

type ReadinessInput = {
  databaseConfigured: boolean;
  databaseReachable: boolean;
  runtime: Awaited<ReturnType<typeof checkRuntimeReadiness>>;
  providers: Awaited<ReturnType<typeof checkProviderProbes>>;
};

export function parseRequiredProductionCapabilities(raw = process.env.PRODUCTION_REQUIRED_CAPABILITIES): ProductionCapability[] {
  return Array.from(new Set((raw ?? "").split(",").map(value => value.trim().toLowerCase()).filter((value): value is ProductionCapability => productionCapabilities.includes(value as ProductionCapability))));
}

export function evaluateRequiredProductionCapabilities(input: ReadinessInput, required = parseRequiredProductionCapabilities()): { configured: boolean; required: ProductionCapability[]; ready: boolean; missing: ProductionCapability[] } {
  const missing = required.filter(capability => {
    if (capability === "database") return !input.databaseConfigured || !input.databaseReachable;
    if (capability === "runtime") return !input.runtime.ready;
    return !input.providers.configured || !input.providers.ready;
  });
  return { configured: required.length > 0, required, ready: missing.length === 0, missing };
}
