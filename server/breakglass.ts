import { createHash } from "node:crypto";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { breakGlassRequests, workspaces } from "../drizzle/schema";
import { getDb } from "./db";
import { appendAuditChainEntry } from "./control-plane/audit-chain";

const MAX_DURATION_MINUTES = 24 * 60;
const MIN_DURATION_MINUTES = 5;
const ACTIVE_STATUSES = ["requested", "approved"] as const;

type BreakGlassActor = { id: number; role?: string | null };

function assertAdmin(actor: BreakGlassActor) {
  if (!Number.isInteger(actor.id) || actor.id < 1 || actor.role !== "admin") throw new Error("Break-glass access requires an administrator.");
}

function assertWorkspaceId(workspaceId: number) {
  if (!Number.isInteger(workspaceId) || workspaceId < 1) throw new Error("workspaceId must be a positive integer.");
}

function normalizeReason(reason: unknown) {
  if (typeof reason !== "string") throw new Error("A break-glass reason is required.");
  const value = reason.trim();
  if (value.length < 20 || value.length > 2_000) throw new Error("Break-glass reason must contain 20-2000 characters.");
  return value;
}

function normalizeDuration(value: unknown) {
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < MIN_DURATION_MINUTES || minutes > MAX_DURATION_MINUTES) throw new Error(`durationMinutes must be an integer between ${MIN_DURATION_MINUTES} and ${MAX_DURATION_MINUTES}.`);
  return minutes;
}

function detailsHash(details: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(details)).digest("hex");
}

async function audit(trx: Parameters<typeof appendAuditChainEntry>[0], workspaceId: number, subject: string, details: Record<string, unknown>) {
  await appendAuditChainEntry(trx, {
    workspaceId,
    category: "break_glass_access",
    subject,
    evidenceHash: detailsHash(details),
    details: JSON.stringify(details),
  });
}

export async function requestBreakGlass(actor: BreakGlassActor, input: { workspaceId: number; reason: unknown; durationMinutes: unknown }) {
  assertAdmin(actor);
  assertWorkspaceId(input.workspaceId);
  const reason = normalizeReason(input.reason);
  const durationMinutes = normalizeDuration(input.durationMinutes);
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.id, input.workspaceId)).limit(1);
  if (!workspace) throw new Error("Workspace tidak ditemukan.");
  const [existing] = await db.select({ id: breakGlassRequests.id }).from(breakGlassRequests).where(and(eq(breakGlassRequests.workspaceId, input.workspaceId), or(...ACTIVE_STATUSES.map(status => eq(breakGlassRequests.status, status))), gt(breakGlassRequests.expiresAt, new Date()))).limit(1);
  if (existing) throw new Error("An active break-glass request already exists for this workspace.");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationMinutes * 60_000);
  return db.transaction(async trx => {
    const [inserted] = await trx.insert(breakGlassRequests).values({ workspaceId: input.workspaceId, requestedByUserId: actor.id, reason, durationMinutes, status: "requested", expiresAt }).$returningId();
    await audit(trx, input.workspaceId, `break-glass-request:${inserted.id}`, { action: "requested", requestId: inserted.id, requestedByUserId: actor.id, durationMinutes, expiresAt: expiresAt.toISOString() });
    return { id: inserted.id, workspaceId: input.workspaceId, status: "requested" as const, requestedByUserId: actor.id, reason, durationMinutes, expiresAt };
  });
}

export async function listBreakGlassRequests(actor: BreakGlassActor, workspaceId?: number) {
  assertAdmin(actor);
  if (workspaceId !== undefined) assertWorkspaceId(workspaceId);
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const rows = await db.select().from(breakGlassRequests).where(workspaceId === undefined ? undefined : eq(breakGlassRequests.workspaceId, workspaceId)).orderBy(desc(breakGlassRequests.createdAt)).limit(200);
  return rows.map(row => ({ ...row, effectiveStatus: row.expiresAt <= new Date() && ACTIVE_STATUSES.includes(row.status as typeof ACTIVE_STATUSES[number]) ? "expired" : row.status }));
}

export async function approveBreakGlass(actor: BreakGlassActor, requestId: number) {
  assertAdmin(actor);
  if (!Number.isInteger(requestId) || requestId < 1) throw new Error("requestId must be a positive integer.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  return db.transaction(async trx => {
    const [request] = await trx.select().from(breakGlassRequests).where(eq(breakGlassRequests.id, requestId)).limit(1).for("update");
    if (!request) throw new Error("Break-glass request tidak ditemukan.");
    if (request.requestedByUserId === actor.id) throw new Error("Break-glass approval requires a second administrator.");
    if (request.status !== "requested") throw new Error("Only requested break-glass access can be approved.");
    if (request.expiresAt <= new Date()) throw new Error("Break-glass request has expired.");
    const approvedAt = new Date();
    await trx.update(breakGlassRequests).set({ status: "approved", approvedByUserId: actor.id, approvedAt }).where(eq(breakGlassRequests.id, requestId));
    await audit(trx, request.workspaceId, `break-glass-request:${requestId}`, { action: "approved", requestId, requestedByUserId: request.requestedByUserId, approvedByUserId: actor.id, approvedAt: approvedAt.toISOString(), expiresAt: request.expiresAt.toISOString() });
    return { ...request, status: "approved" as const, approvedByUserId: actor.id, approvedAt };
  });
}

export async function revokeBreakGlass(actor: BreakGlassActor, requestId: number) {
  assertAdmin(actor);
  if (!Number.isInteger(requestId) || requestId < 1) throw new Error("requestId must be a positive integer.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  return db.transaction(async trx => {
    const [request] = await trx.select().from(breakGlassRequests).where(eq(breakGlassRequests.id, requestId)).limit(1).for("update");
    if (!request) throw new Error("Break-glass request tidak ditemukan.");
    if (!ACTIVE_STATUSES.includes(request.status as typeof ACTIVE_STATUSES[number])) throw new Error("Only active break-glass access can be revoked.");
    const revokedAt = new Date();
    await trx.update(breakGlassRequests).set({ status: "revoked", revokedByUserId: actor.id, revokedAt }).where(eq(breakGlassRequests.id, requestId));
    await audit(trx, request.workspaceId, `break-glass-request:${requestId}`, { action: "revoked", requestId, revokedByUserId: actor.id, revokedAt: revokedAt.toISOString() });
    return { ...request, status: "revoked" as const, revokedByUserId: actor.id, revokedAt };
  });
}

export async function hasActiveBreakGlassAccess(userId: number, workspaceId: number) {
  if (!Number.isInteger(userId) || userId < 1) return false;
  assertWorkspaceId(workspaceId);
  const db = await getDb();
  if (!db) return false;
  const [row] = await db.select({ id: breakGlassRequests.id }).from(breakGlassRequests).where(and(eq(breakGlassRequests.workspaceId, workspaceId), eq(breakGlassRequests.requestedByUserId, userId), eq(breakGlassRequests.status, "approved"), gt(breakGlassRequests.expiresAt, new Date()), isNull(breakGlassRequests.revokedAt))).limit(1);
  return Boolean(row);
}
