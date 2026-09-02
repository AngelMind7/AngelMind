import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { idempotencyRecords } from "../drizzle/schema";
import { getDb } from "./db";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1_000;

export function normalizeIdempotencyKey(value: string) {
  const key = value.trim();
  if (key.length < 8 || key.length > 180) throw new Error("Idempotency key must contain 8-180 characters.");
  return key;
}

export function hashIdempotencyRequest(input: unknown) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function executeIdempotent<T>(input: {
  userId: number;
  scope: string;
  key: string;
  request: unknown;
  ttlMs?: number;
  handler: () => Promise<T>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const scope = input.scope.trim();
  if (scope.length < 2 || scope.length > 160) throw new Error("Idempotency scope must contain 2-160 characters.");
  const key = normalizeIdempotencyKey(input.key);
  const requestHash = hashIdempotencyRequest(input.request);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + Math.max(60_000, input.ttlMs ?? DEFAULT_TTL_MS));
  const where = and(eq(idempotencyRecords.userId, input.userId), eq(idempotencyRecords.scope, scope), eq(idempotencyRecords.idempotencyKey, key));
  const [existing] = await db.select().from(idempotencyRecords).where(and(where, gt(idempotencyRecords.expiresAt, now))).limit(1);
  if (existing) {
    if (existing.requestHash !== requestHash) throw new Error("Idempotency key is already used for a different request.");
    if (existing.status === "in_progress") throw new Error("A request with this idempotency key is already in progress.");
    if (existing.status === "failed") throw new Error("The previous request for this idempotency key failed; use a new key.");
    if (!existing.responsePayload) throw new Error("Idempotent response is unavailable.");
    return { value: JSON.parse(existing.responsePayload) as T, replayed: true };
  }
  try {
    await db.insert(idempotencyRecords).values({ userId: input.userId, scope, idempotencyKey: key, requestHash, status: "in_progress", expiresAt });
  } catch {
    const [concurrent] = await db.select().from(idempotencyRecords).where(where).limit(1);
    if (concurrent?.requestHash !== requestHash) throw new Error("Idempotency key is already used for a different request.");
    if (concurrent?.status === "completed" && concurrent.responsePayload) return { value: JSON.parse(concurrent.responsePayload) as T, replayed: true };
    throw new Error("A request with this idempotency key is already in progress.");
  }
  try {
    const value = await input.handler();
    await db.update(idempotencyRecords).set({ status: "completed", responsePayload: JSON.stringify(value) }).where(where);
    return { value, replayed: false };
  } catch (error) {
    await db.update(idempotencyRecords).set({ status: "failed" }).where(where);
    throw error;
  }
}

export const idempotencyConfig = { defaultTtlMs: DEFAULT_TTL_MS } as const;
