import { createHash } from "node:crypto";

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;
export const MAX_CURSOR_LENGTH = 512;

type CursorPayload = {
  v: 1;
  after: string;
  scope?: string;
};

function encode(value: CursorPayload): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decode(cursor: string): CursorPayload | null {
  if (typeof cursor !== "string" || cursor.length === 0 || cursor.length > MAX_CURSOR_LENGTH) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as Partial<CursorPayload>;
    if (value.v !== 1 || typeof value.after !== "string" || value.after.length === 0 || value.after.length > 256) return null;
    if (value.scope !== undefined && (typeof value.scope !== "string" || value.scope.length > 256)) return null;
    return { v: 1, after: value.after, ...(value.scope === undefined ? {} : { scope: value.scope }) };
  } catch {
    return null;
  }
}

export function normalizePageSize(value?: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(value as number)));
}

export function createCursor(after: string | number, scope?: string): string {
  const normalized = String(after).trim();
  if (!normalized || normalized.length > 256) throw new Error("Pagination cursor boundary is invalid.");
  const normalizedScope = scope?.trim();
  if (normalizedScope && normalizedScope.length > 256) throw new Error("Pagination cursor scope is invalid.");
  const cursor = encode({ v: 1, after: normalized, ...(normalizedScope ? { scope: normalizedScope } : {}) });
  if (cursor.length > MAX_CURSOR_LENGTH) throw new Error("Pagination cursor exceeds the size limit.");
  return cursor;
}

export function parseCursor(cursor: string | undefined, expectedScope?: string): { after: string; scope?: string } | null {
  if (!cursor) return null;
  const parsed = decode(cursor);
  if (!parsed) return null;
  if (expectedScope !== undefined && parsed.scope !== expectedScope) return null;
  return { after: parsed.after, ...(parsed.scope === undefined ? {} : { scope: parsed.scope }) };
}

export function assertCursor(cursor: string | undefined, expectedScope?: string) {
  const parsed = parseCursor(cursor, expectedScope);
  if (cursor !== undefined && !parsed) throw new Error("Invalid or expired pagination cursor.");
  return parsed;
}

export function pageFingerprint(scope: string, cursor: string | undefined, pageSize: number): string {
  const material = `${scope}\u0000${cursor ?? ""}\u0000${normalizePageSize(pageSize)}`;
  return createHash("sha256").update(material).digest("hex");
}
