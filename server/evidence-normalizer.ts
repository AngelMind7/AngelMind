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

