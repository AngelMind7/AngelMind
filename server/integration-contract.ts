import { createHash } from "node:crypto";

export const integrationScopeCatalog = {
  github: ["repo:read", "issues:read", "findings:write"] as const,
  gitlab: ["project:read", "issues:read", "findings:write"] as const,
  slack: ["messages:read", "notifications:write"] as const,
  discord: ["messages:read", "notifications:write"] as const,
  custom: ["records:read", "records:write"] as const,
} as const;

export type IntegrationContractProvider = keyof typeof integrationScopeCatalog;
export type IntegrationPreviewEvent = {
  externalId: string;
  kind: "finding" | "comment" | "notification" | "record";
  title: string;
  payload: Record<string, unknown>;
};

export type IntegrationSyncPreview = {
  provider: IntegrationContractProvider;
  eventCount: number;
  accepted: IntegrationPreviewEvent[];
  rejected: Array<{ index: number; reason: string }>;
  evidenceHash: string;
  targetTraffic: false;
  dispatch: "preview_only";
};

export function validateIntegrationScopes(provider: IntegrationContractProvider, scopes: string[]) {
  const allowed = new Set(integrationScopeCatalog[provider]);
  if (scopes.length === 0 || scopes.length > 10) return { valid: false, invalid: ["scope_count"] };
  const invalid = [...new Set(scopes.filter(scope => !allowed.has(scope as never)))];
  return { valid: invalid.length === 0, invalid };
}

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function planIntegrationSync(input: {
  provider: IntegrationContractProvider;
  status: "draft" | "connected" | "disabled";
  scopes: string[];
  fixture: string;
}): IntegrationSyncPreview {
  const scopeCheck = validateIntegrationScopes(input.provider, input.scopes);
  if (!scopeCheck.valid) throw new Error(`Integration scopes invalid: ${scopeCheck.invalid.join(",")}`);
  let parsed: unknown;
  try { parsed = JSON.parse(input.fixture); } catch { throw new Error("Integration fixture must be valid JSON."); }
  if (!Array.isArray(parsed) || parsed.length > 100) throw new Error("Integration fixture must be an array of at most 100 events.");
  const accepted: IntegrationPreviewEvent[] = [];
  const rejected: IntegrationSyncPreview["rejected"] = [];
  parsed.forEach((event, index) => {
    if (!event || typeof event !== "object") { rejected.push({ index, reason: "event_not_object" }); return; }
    const value = event as Record<string, unknown>;
    const kind = value.kind;
    const externalId = value.externalId;
    const title = value.title;
    if (!["finding", "comment", "notification", "record"].includes(String(kind))) { rejected.push({ index, reason: "unsupported_kind" }); return; }
    if (typeof externalId !== "string" || externalId.length < 1 || externalId.length > 160) { rejected.push({ index, reason: "invalid_external_id" }); return; }
    if (typeof title !== "string" || title.trim().length < 1 || title.length > 240) { rejected.push({ index, reason: "invalid_title" }); return; }
    accepted.push({ externalId, kind: kind as IntegrationPreviewEvent["kind"], title: title.trim(), payload: value.payload && typeof value.payload === "object" ? value.payload as Record<string, unknown> : {} });
  });
  return { provider: input.provider, eventCount: parsed.length, accepted: input.status === "connected" ? accepted : [], rejected: input.status === "connected" ? rejected : [...rejected, ...accepted.map((_, index) => ({ index, reason: `connection_${input.status}` }))], evidenceHash: digest({ provider: input.provider, status: input.status, scopes: input.scopes, accepted, rejected }), targetTraffic: false, dispatch: "preview_only" };
}
