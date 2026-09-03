import { createHash } from "node:crypto";

export type FeatureFlagDefinition = {
  enabled?: boolean;
  environments?: string[];
  allowUsers?: number[];
  allowOrganizations?: number[];
  rolloutPercentage?: number;
};

export type FeatureFlagConfig = Record<string, FeatureFlagDefinition>;

export function parseFeatureFlags(value: string | undefined): FeatureFlagConfig {
  if (!value?.trim()) return {};
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error("FEATURE_FLAGS must be valid JSON."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("FEATURE_FLAGS must be a JSON object.");
  const config: FeatureFlagConfig = {};
  for (const [flag, raw] of Object.entries(parsed)) {
    if (!/^[A-Za-z0-9._-]{1,120}$/.test(flag) || !raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`FEATURE_FLAGS contains an invalid definition for '${flag}'.`);
    const definition = raw as Record<string, unknown>;
    const environments = definition.environments === undefined ? undefined : Array.isArray(definition.environments) && definition.environments.every(value => typeof value === "string") ? definition.environments.map(value => value.trim()).filter(Boolean) : null;
    const allowUsers = definition.allowUsers === undefined ? undefined : Array.isArray(definition.allowUsers) && definition.allowUsers.every(value => Number.isInteger(value) && Number(value) > 0) ? definition.allowUsers as number[] : null;
    const allowOrganizations = definition.allowOrganizations === undefined ? undefined : Array.isArray(definition.allowOrganizations) && definition.allowOrganizations.every(value => Number.isInteger(value) && Number(value) > 0) ? definition.allowOrganizations as number[] : null;
    const rolloutPercentage = definition.rolloutPercentage === undefined ? undefined : typeof definition.rolloutPercentage === "number" && Number.isFinite(definition.rolloutPercentage) && definition.rolloutPercentage >= 0 && definition.rolloutPercentage <= 100 ? definition.rolloutPercentage : null;
    if (environments === null || allowUsers === null || allowOrganizations === null || rolloutPercentage === null || (definition.enabled !== undefined && typeof definition.enabled !== "boolean")) throw new Error(`FEATURE_FLAGS contains an invalid definition for '${flag}'.`);
    config[flag] = { enabled: definition.enabled as boolean | undefined, environments, allowUsers, allowOrganizations, rolloutPercentage };
  }
  return config;
}

function rolloutBucket(flag: string, subject: string): number {
  const digest = createHash("sha256").update(`${flag}:${subject}`).digest();
  return (digest.readUInt32BE(0) / 0xffffffff) * 100;
}

export function isFeatureEnabled(input: {
  flag: string;
  environment: string;
  userId?: number;
  organizationId?: number;
  config?: FeatureFlagConfig;
  entitlementFlags?: string[];
}): boolean {
  if (!input || typeof input.flag !== "string" || !/^[A-Za-z0-9._-]{1,120}$/.test(input.flag) || typeof input.environment !== "string" || !input.environment.trim()) return false;
  if (input.userId !== undefined && (!Number.isInteger(input.userId) || input.userId < 1)) return false;
  if (input.organizationId !== undefined && (!Number.isInteger(input.organizationId) || input.organizationId < 1)) return false;
  if (input.entitlementFlags !== undefined && (!Array.isArray(input.entitlementFlags) || !input.entitlementFlags.every(value => typeof value === "string"))) return false;
  const definition = input.config?.[input.flag];
  if (!definition || definition.enabled !== true) return false;
  if (definition.environments?.length && !definition.environments.includes(input.environment.trim())) return false;
  if (definition.allowUsers?.length) return input.userId !== undefined && definition.allowUsers.includes(input.userId);
  if (definition.allowOrganizations?.length) return input.organizationId !== undefined && definition.allowOrganizations.includes(input.organizationId);
  if (input.entitlementFlags?.includes(input.flag)) return true;
  if (definition.rolloutPercentage === undefined) return true;
  if (!Number.isFinite(definition.rolloutPercentage) || definition.rolloutPercentage <= 0) return false;
  if (definition.rolloutPercentage >= 100) return true;
  const subject = `${input.organizationId ?? "org:none"}:${input.userId ?? "user:none"}`;
  return rolloutBucket(input.flag, subject) < definition.rolloutPercentage;
}

export function requireFeature(input: Parameters<typeof isFeatureEnabled>[0]): void {
  if (!isFeatureEnabled(input)) throw new Error(`Feature is not enabled: ${input.flag}`);
}
