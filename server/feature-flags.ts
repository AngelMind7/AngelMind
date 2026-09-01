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
  return parsed as FeatureFlagConfig;
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
  const definition = input.config?.[input.flag];
  if (!definition || definition.enabled !== true) return false;
  if (definition.environments?.length && !definition.environments.includes(input.environment)) return false;
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
