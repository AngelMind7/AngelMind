import { createHash } from "node:crypto";

export type EvidenceClassification = "public" | "internal" | "sensitive" | "restricted";

export type CanonicalEvidence = {
  schema: "angelmind.canonical-evidence.v1";
  observedAt: string;
  data: Record<string, unknown>;
  classification: EvidenceClassification;
  confidence: number;
  sha256: string;
  chainReferences: string[];
  falsePositive: boolean;
};

const RESTRICTED_KEYS = /(password|passwd|secret|credential|api[_-]?key)/i;
const TOKEN_KEYS = /token/i;
const MAX_STRING_LENGTH = 20_000;

function mask(value: string, keep: number): string {
  if (value.length <= keep * 2) return "[REDACTED]";
  return `${value.slice(0, keep)}…${value.slice(-keep)}`;
}

function sanitizeString(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[<>]/g, character => (character === "<" ? "&lt;" : "&gt;"))
    .slice(0, MAX_STRING_LENGTH);
}

function normalizeValue(value: unknown, key = ""): unknown {
  if (typeof value === "string") {
    if (/password/i.test(key)) return "[REDACTED]";
    if (RESTRICTED_KEYS.test(key)) return mask(value, 4);
    if (TOKEN_KEYS.test(key)) return mask(value, 8);
    return sanitizeString(value);
  }
  if (Array.isArray(value)) return value.slice(0, 500).map(item => normalizeValue(item, key));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 500)
        .map(([childKey, childValue]) => [childKey, normalizeValue(childValue, childKey)]),
    );
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean" || value === null) return value;
  return String(value).slice(0, MAX_STRING_LENGTH);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function classifyEvidence(capabilities: string[] = []): EvidenceClassification {
  if (!Array.isArray(capabilities) || !capabilities.every(value => typeof value === "string")) return "restricted";
  const normalized = capabilities.map(value => value.toLowerCase());
  if (normalized.some(value => value.includes("credential") || value.includes("identity") || value.includes("secret"))) return "restricted";
  if (normalized.some(value => value.includes("source") || value.includes("code"))) return "sensitive";
  if (normalized.some(value => value.includes("port") || value.includes("network"))) return "sensitive";
  return normalized.some(value => value.includes("recon") || value.includes("web")) ? "internal" : "public";
}

export function normalizeEvidence(input: {
  data: Record<string, unknown>;
  observedAt?: string | Date;
  capabilities?: string[];
  confidence?: number;
  chainReferences?: string[];
  falsePositive?: boolean;
}): CanonicalEvidence {
  if (!input || !input.data || typeof input.data !== "object" || Array.isArray(input.data)) throw new Error("Evidence data must be an object.");
  if (input.chainReferences !== undefined && (!Array.isArray(input.chainReferences) || !input.chainReferences.every(value => typeof value === "string"))) throw new Error("Evidence chain references must be strings.");
  const observedAt = input.observedAt ? new Date(input.observedAt) : new Date();
  if (Number.isNaN(observedAt.getTime())) throw new Error("Evidence timestamp must be a valid date.");
  const data = normalizeValue(input.data) as Record<string, unknown>;
  const confidence = Math.min(1, Math.max(0, Number.isFinite(input.confidence ?? 0) ? input.confidence ?? 0 : 0));
  const chainReferences = Array.from(new Set((input.chainReferences ?? []).map(value => value.trim()).filter(Boolean))).slice(0, 100);
  const canonical = { data, observedAt: observedAt.toISOString(), classification: classifyEvidence(input.capabilities), confidence, chainReferences, falsePositive: input.falsePositive === true };
  return { schema: "angelmind.canonical-evidence.v1", ...canonical, sha256: createHash("sha256").update(stableJson(canonical)).digest("hex") };
}

export function verifyEvidenceHash(evidence: CanonicalEvidence): boolean {
  const { sha256: expected, schema: _schema, ...canonical } = evidence;
  return createHash("sha256").update(stableJson(canonical)).digest("hex") === expected;
}

export type EvidenceSchemaId =
  | "jwt_token_comparison" | "sqli_evidence" | "xss_evidence" | "ssrf_evidence"
  | "cloud_metadata_evidence" | "graphql_introspection_evidence" | "graphql_batching_evidence"
  | "idor_evidence" | "ssti_evidence" | "rce_evidence" | "host_header_evidence"
  | "cache_poisoning_evidence" | "race_condition_evidence" | "file_upload_evidence" | "xxe_evidence";

export type EvidenceSchemaDefinition = {
  id: EvidenceSchemaId;
  vectors: string[];
  redactedKeys: string[];
  falsePositive: (data: Record<string, unknown>) => boolean;
};

const statusFalsePositive = (data: Record<string, unknown>, statuses: number[]) => {
  const status = Number(data.status ?? data.statusCode ?? data.httpStatus);
  return Number.isFinite(status) && statuses.includes(status);
};

export const evidenceSchemas: Record<EvidenceSchemaId, EvidenceSchemaDefinition> = {
  jwt_token_comparison: { id: "jwt_token_comparison", vectors: ["auth-jwt-alg-confusion", "auth-jwt-none"], redactedKeys: ["token", "secret"], falsePositive: data => statusFalsePositive(data, [401]) },
  sqli_evidence: { id: "sqli_evidence", vectors: ["sqli-classic", "sqli-blind"], redactedKeys: ["credential", "password"], falsePositive: data => /generic error/i.test(String(data.message ?? data.error ?? "")) },
  xss_evidence: { id: "xss_evidence", vectors: ["xss-reflected", "xss-stored"], redactedKeys: ["cookie", "session"], falsePositive: data => /csp.*block|blocked.*csp/i.test(String(data.message ?? data.error ?? "")) },
  ssrf_evidence: { id: "ssrf_evidence", vectors: ["ssrf-internal"], redactedKeys: ["internal_ip"], falsePositive: data => statusFalsePositive(data, [403, 404]) },
  cloud_metadata_evidence: { id: "cloud_metadata_evidence", vectors: ["cloud-metadata-exposure"], redactedKeys: ["credential", "token"], falsePositive: data => /imdsv2.*enabled/i.test(String(data.message ?? data.error ?? "")) },
  graphql_introspection_evidence: { id: "graphql_introspection_evidence", vectors: ["graphql-introspection-abuse"], redactedKeys: ["schema"], falsePositive: data => /introspection.*disabled/i.test(String(data.message ?? data.error ?? "")) },
  graphql_batching_evidence: { id: "graphql_batching_evidence", vectors: ["graphql-batching"], redactedKeys: ["user_data"], falsePositive: data => /rate.?limit/i.test(String(data.message ?? data.error ?? "")) },
  idor_evidence: { id: "idor_evidence", vectors: ["idor-horizontal", "idor-vertical"], redactedKeys: ["user_data"], falsePositive: data => statusFalsePositive(data, [403, 404]) },
  ssti_evidence: { id: "ssti_evidence", vectors: ["ssti-server-side"], redactedKeys: ["code"], falsePositive: data => /sandbox/i.test(String(data.message ?? data.error ?? "")) },
  rce_evidence: { id: "rce_evidence", vectors: ["rce-command-injection"], redactedKeys: ["command"], falsePositive: data => /sandbox/i.test(String(data.message ?? data.error ?? "")) },
  host_header_evidence: { id: "host_header_evidence", vectors: ["host-header-injection"], redactedKeys: ["email"], falsePositive: data => /whitelist/i.test(String(data.message ?? data.error ?? "")) },
  cache_poisoning_evidence: { id: "cache_poisoning_evidence", vectors: ["cache-poisoning"], redactedKeys: ["cache_key"], falsePositive: data => /cache.*disabled/i.test(String(data.message ?? data.error ?? "")) },
  race_condition_evidence: { id: "race_condition_evidence", vectors: ["race-condition"], redactedKeys: ["state"], falsePositive: data => /locking|lock acquired/i.test(String(data.message ?? data.error ?? "")) },
  file_upload_evidence: { id: "file_upload_evidence", vectors: ["file-upload-abuse"], redactedKeys: ["file"], falsePositive: data => /antivirus|malware.*blocked/i.test(String(data.message ?? data.error ?? "")) },
  xxe_evidence: { id: "xxe_evidence", vectors: ["xxe-out-of-band"], redactedKeys: ["xml"], falsePositive: data => /parser.*disabled/i.test(String(data.message ?? data.error ?? "")) },
};

export function normalizeEvidenceForSchema(schemaId: EvidenceSchemaId, input: Omit<Parameters<typeof normalizeEvidence>[0], "falsePositive">): CanonicalEvidence {
  const schema = evidenceSchemas[schemaId];
  const redactedData = { ...input.data };
  for (const key of schema.redactedKeys) {
    for (const [actualKey, value] of Object.entries(redactedData)) {
      if (actualKey.toLowerCase() === key.toLowerCase() && typeof value === "string") {
        const normalized = redactEvidenceValue(actualKey, value);
        redactedData[actualKey] = normalized === sanitizeString(value) ? mask(value, 4) : normalized;
      }
    }
  }
  return normalizeEvidence({ ...input, data: redactedData, falsePositive: schema.falsePositive(redactedData) });
}

export const redactEvidenceValue = (key: string, value: string) => normalizeValue(value, key) as string;

export { stableJson };

// A small deterministic rate limiter shared by adapters and job handlers.
export class TargetRateLimiter {
  private readonly nextAllowedAt = new Map<string, number>();
  constructor(private readonly clock: () => number = Date.now) {}
  allow(target: string, requestsPerMinute: number): boolean {
    const normalized = target.trim().toLowerCase();
    if (!normalized || !Number.isFinite(requestsPerMinute) || requestsPerMinute <= 0) return false;
    const interval = 60_000 / Math.min(requestsPerMinute, 600);
    const now = this.clock();
    const next = this.nextAllowedAt.get(normalized) ?? 0;
    if (now < next) return false;
    this.nextAllowedAt.set(normalized, now + interval);
    return true;
  }
  reset(target?: string) { if (target) this.nextAllowedAt.delete(target.trim().toLowerCase()); else this.nextAllowedAt.clear(); }
}

export class RateLimitExceeded extends Error {
  constructor(target: string) { super(`Target-side rate limit exceeded for ${target}.`); this.name = "RateLimitExceeded"; }
}

export function enforceTargetRateLimit(limiter: TargetRateLimiter, target: string, requestsPerMinute: number): void {
  if (!limiter.allow(target, requestsPerMinute)) throw new RateLimitExceeded(target);
}

