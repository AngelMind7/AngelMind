import { sha256 } from "./archive-integrity";
import type { ProgramScope } from "./program-scope";

export type AuthorizationReference = {
  documentId: string;
  validFrom: string;
  validUntil: string;
  authorizedBy: string;
  scopeSnapshotHash: string;
};

export type AuthorizationCheckResult =
  | { valid: true; reference: AuthorizationReference }
  | { valid: false; reason: "missing" | "malformed" | "not_yet_valid" | "expired" | "scope_changed" };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseAuthorizationReference(raw: string | null | undefined): AuthorizationReference | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const candidate = parsed as Record<string, unknown>;
  if (
    !isNonEmptyString(candidate.documentId) ||
    !isNonEmptyString(candidate.validFrom) ||
    !isNonEmptyString(candidate.validUntil) ||
    !isNonEmptyString(candidate.authorizedBy) ||
    !isNonEmptyString(candidate.scopeSnapshotHash)
  ) return null;
  const validFrom = new Date(candidate.validFrom);
  const validUntil = new Date(candidate.validUntil);
  if (!Number.isFinite(validFrom.getTime()) || !Number.isFinite(validUntil.getTime()) || validUntil <= validFrom) return null;
  if (!/^sha256:[a-f0-9]{64}$/i.test(candidate.scopeSnapshotHash.trim())) return null;
  return {
    documentId: candidate.documentId.trim(),
    validFrom: candidate.validFrom,
    validUntil: candidate.validUntil,
    authorizedBy: candidate.authorizedBy.trim(),
    scopeSnapshotHash: candidate.scopeSnapshotHash.trim().toLowerCase(),
  };
}

export function serializeAuthorizationReference(reference: AuthorizationReference): string {
  const valid = parseAuthorizationReference(JSON.stringify(reference));
  if (!valid) throw new Error("Authorization reference is malformed.");
  return JSON.stringify(valid);
}

export function computeScopeSnapshotHash(scope: Pick<ProgramScope, "includedAssets" | "excludedAssets" | "rules" | "safeHarbor">): string {
  const canonical = JSON.stringify({
    includedAssets: [...scope.includedAssets].sort(),
    excludedAssets: [...scope.excludedAssets].sort(),
    rules: [...scope.rules].sort(),
    safeHarbor: scope.safeHarbor.trim(),
  });
  return `sha256:${sha256(canonical)}`;
}

export function verifyAuthorizationReference(input: {
  authorizationReference: string | null | undefined;
  scope: Pick<ProgramScope, "includedAssets" | "excludedAssets" | "rules" | "safeHarbor">;
  now?: Date;
}): AuthorizationCheckResult {
  if (!input || !input.scope || typeof input.scope !== "object") return { valid: false, reason: "malformed" };
  const reference = parseAuthorizationReference(input.authorizationReference);
  if (!reference) return { valid: false, reason: input.authorizationReference ? "malformed" : "missing" };
  const now = input.now ?? new Date();
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) return { valid: false, reason: "malformed" };
  if (now < new Date(reference.validFrom)) return { valid: false, reason: "not_yet_valid" };
  if (now >= new Date(reference.validUntil)) return { valid: false, reason: "expired" };
  if (reference.scopeSnapshotHash !== computeScopeSnapshotHash(input.scope)) return { valid: false, reason: "scope_changed" };
  return { valid: true, reference };
}
