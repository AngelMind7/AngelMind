import { createHash } from "node:crypto";

export type PageCursor = { createdAt: string; id: number };

export function encodePageCursor(cursor: PageCursor): string {
  if (!Number.isInteger(cursor.id) || cursor.id < 1) throw new Error("Cursor id must be a positive integer.");
  const createdAt = new Date(cursor.createdAt);
  if (Number.isNaN(createdAt.getTime())) throw new Error("Cursor timestamp must be valid.");
  return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id: cursor.id }), "utf8").toString("base64url");
}

export function decodePageCursor(value: string | undefined): PageCursor | null {
  if (!value?.trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<PageCursor>;
    const id = parsed.id;
    if (!parsed.createdAt || typeof id !== "number" || !Number.isInteger(id) || id < 1) throw new Error("invalid");
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) throw new Error("invalid");
    return { createdAt: createdAt.toISOString(), id };
  } catch { throw new Error("Invalid pagination cursor."); }
}

export function pageResult<T extends { createdAt: Date; id: number }>(rows: T[], pageSize: number) {
  const size = Math.min(Math.max(Math.floor(pageSize), 1), 100);
  const hasNextPage = rows.length > size;
  const items = rows.slice(0, size);
  const last = items.at(-1);
  return { items, hasNextPage, nextCursor: hasNextPage && last ? encodePageCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null };
}

export function assertExpectedRevision(expectedRevision: number, actualRevision: number): void {
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) throw new Error("Expected revision must be a non-negative integer.");
  if (expectedRevision !== actualRevision) throw new Error("Concurrent update detected; reload the resource and retry.");
}

export function nextRevision(revision: number): number {
  if (!Number.isInteger(revision) || revision < 0 || revision >= 2_147_483_647) throw new Error("Revision is invalid or exhausted.");
  return revision + 1;
}

export function requestFingerprint(input: { method: string; path: string; body: unknown }): string {
  return createHash("sha256").update(JSON.stringify({ method: input.method.toUpperCase(), path: input.path, body: input.body })).digest("hex");
}
