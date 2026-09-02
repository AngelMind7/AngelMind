import { and, desc, eq } from "drizzle-orm";
import { approvals, auditArchives, auditEvents, evidenceArtifacts, notifications, restoreDrillRuns, runs, users, webhookConfigurations, workspaceMemberships, workspaces } from "../../drizzle/schema";
import { getDb, getOwnedWorkspace, getUserByEmail } from "../db";
import { storageGetSignedUrl, storagePut } from "../storage";
import { ENV } from "../_core/env";
import { assertArchiveManifest, sha256, signArchiveManifest, verifyArchiveIntegrity } from "./archive-integrity";
import { normalizeWebhookEvents, assertSafeWebhookEndpoint } from "./webhook-policy";
import type { NotificationEvent } from "./notifications";
import { currentTraceContext } from "../_core/trace-context";
import { encryptAuditState } from "./audit-state-crypto";
import { normalizeIdempotencyKey } from "../idempotency";

const memberRoles = ["operator", "reviewer", "auditor", "approval_authority"] as const;
export type MemberRole = (typeof memberRoles)[number];
export type WorkspaceRole = "owner" | MemberRole;
export type WorkspaceAccessIntent = "read" | "review" | "respond" | "manage";

export function roleAllowsWorkspaceAccess(role: WorkspaceRole | "approval_authority", intent: WorkspaceAccessIntent): boolean {
  if (role === "owner") return true;
  if (intent === "read") return role === "operator" || role === "reviewer" || role === "auditor" || role === "approval_authority";
  if (intent === "review") return role === "reviewer";
  if (intent === "respond") return role === "operator";
  return false;
}

export function ownerMembershipRecord(workspaceId: number, ownerUserId: number) {
  return { workspaceId, userId: ownerUserId, role: "owner" as const, addedByUserId: ownerUserId };
}

async function ownedWorkspaceOrThrow(userId: number, workspaceId: number) {
  const workspace = await getOwnedWorkspace(workspaceId, userId);
  if (!workspace) throw new Error("Workspace tidak ditemukan atau tidak dapat dikelola.");
  return workspace;
}

async function workspaceAccessOrThrow(userId: number, workspaceId: number, intent: WorkspaceAccessIntent) {
  if (!(await canAccessWorkspace(userId, workspaceId, intent))) throw new Error("Workspace tidak ditemukan atau role tidak memiliki akses untuk operasi ini.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  if (!workspace) throw new Error("Workspace tidak ditemukan.");
  return workspace;
}

async function addAudit(workspaceId: number, category: string, subject: string, details: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return;
  const traceId = currentTraceContext()?.traceId ?? null;
  await db.insert(auditEvents).values({ workspaceId, category, subject, traceId, details: ENV.auditStateEncryptionKey ? encryptAuditState(details, ENV.auditStateEncryptionKey) : JSON.stringify(details), evidenceHash: sha256(JSON.stringify({ workspaceId, category, subject, details, traceId })) });
}

export async function ensureOwnerMembership(workspaceId: number, ownerUserId: number) {
  const db = await getDb();
  if (!db) return;
  const owner = ownerMembershipRecord(workspaceId, ownerUserId);
  await db.insert(workspaceMemberships).values(owner).onDuplicateKeyUpdate({ set: { role: "owner", addedByUserId: ownerUserId } });
}

export async function listMembers(ownerUserId: number, workspaceId: number) {
  const workspace = await ownedWorkspaceOrThrow(ownerUserId, workspaceId);
  await ensureOwnerMembership(workspace.id, workspace.ownerUserId);
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: workspaceMemberships.id, workspaceId: workspaceMemberships.workspaceId, userId: workspaceMemberships.userId, role: workspaceMemberships.role, createdAt: workspaceMemberships.createdAt, name: users.name, email: users.email }).from(workspaceMemberships).leftJoin(users, eq(workspaceMemberships.userId, users.id)).where(eq(workspaceMemberships.workspaceId, workspaceId)).orderBy(desc(workspaceMemberships.createdAt));
}

export async function addMember(ownerUserId: number, input: { workspaceId: number; email: string; role: MemberRole }) {
  const workspace = await ownedWorkspaceOrThrow(ownerUserId, input.workspaceId);
  const user = await getUserByEmail(input.email);
  if (!user) throw new Error("User harus login sekali terlebih dahulu agar dapat ditambahkan melalui email.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.insert(workspaceMemberships).values({ workspaceId: workspace.id, userId: user.id, role: input.role, addedByUserId: ownerUserId }).onDuplicateKeyUpdate({ set: { role: input.role, addedByUserId: ownerUserId } });
  await addAudit(workspace.id, "membership", "workspace-member-upserted", { memberUserId: user.id, role: input.role, addedByUserId: ownerUserId });
  return { success: true };
}

export async function removeMember(ownerUserId: number, workspaceId: number, membershipId: number) {
  const workspace = await ownedWorkspaceOrThrow(ownerUserId, workspaceId);
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [membership] = await db.select().from(workspaceMemberships).where(eq(workspaceMemberships.id, membershipId)).limit(1);
  if (!membership || membership.workspaceId !== workspace.id) throw new Error("Keanggotaan tidak ditemukan.");
  if (membership.role === "owner") throw new Error("Owner membership cannot be removed from this interface.");
  await db.delete(workspaceMemberships).where(eq(workspaceMemberships.id, membership.id));
  await addAudit(workspace.id, "membership", "workspace-member-removed", { memberUserId: membership.userId, removedByUserId: ownerUserId });
  return { success: true };
}

export async function getReviewerWorkspaceIds(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const memberships = await db.select({ workspaceId: workspaceMemberships.workspaceId }).from(workspaceMemberships).where(and(eq(workspaceMemberships.userId, userId), eq(workspaceMemberships.role, "reviewer")));
  return memberships.filter(membership => membership.workspaceId > 0).map(membership => membership.workspaceId);
}

export async function getReadableWorkspaceIds(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const [owned, memberships] = await Promise.all([
    db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.ownerUserId, userId)),
    db.select({ workspaceId: workspaceMemberships.workspaceId, role: workspaceMemberships.role }).from(workspaceMemberships).where(eq(workspaceMemberships.userId, userId)),
  ]);
  const ownedIds = owned.map(workspace => workspace.id);
  const memberIds = memberships.filter(membership => roleAllowsWorkspaceAccess(membership.role, "read")).map(membership => membership.workspaceId);
  return ownedIds.concat(memberIds.filter(workspaceId => !ownedIds.includes(workspaceId)));
}

export async function canAccessWorkspace(userId: number, workspaceId: number, intent: WorkspaceAccessIntent) {
  const db = await getDb();
  if (!db) return false;
  const [workspace] = await db.select({ ownerUserId: workspaces.ownerUserId }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  if (!workspace) return false;
  if (workspace.ownerUserId === userId) return true;
  const [membership] = await db.select({ role: workspaceMemberships.role }).from(workspaceMemberships).where(and(eq(workspaceMemberships.workspaceId, workspaceId), eq(workspaceMemberships.userId, userId))).limit(1);
  return Boolean(membership && roleAllowsWorkspaceAccess(membership.role, intent));
}

export async function hasReviewerMembership(userId: number, workspaceId: number) {
  const db = await getDb();
  if (!db) return false;
  const [membership] = await db.select().from(workspaceMemberships).where(and(eq(workspaceMemberships.workspaceId, workspaceId), eq(workspaceMemberships.userId, userId), eq(workspaceMemberships.role, "reviewer"))).limit(1);
  return Boolean(membership);
}

export async function getWebhookConfiguration(ownerUserId: number, workspaceId: number) {
  await ownedWorkspaceOrThrow(ownerUserId, workspaceId);
  const db = await getDb();
  if (!db) return undefined;
  const [configuration] = await db.select().from(webhookConfigurations).where(eq(webhookConfigurations.workspaceId, workspaceId)).limit(1);
  return configuration;
}

export async function saveWebhookDraft(ownerUserId: number, input: { workspaceId: number; endpoint: string; signingSecretReference?: string; eventTypes: NotificationEvent[]; endpointConfirmed: boolean }) {
  const workspace = await ownedWorkspaceOrThrow(ownerUserId, input.workspaceId);
  const endpoint = assertSafeWebhookEndpoint(input.endpoint).toString();
  const eventTypes = normalizeWebhookEvents(input.eventTypes);
  if (input.signingSecretReference && !input.signingSecretReference.startsWith(`secret://workspace-${workspace.id}/webhook-`)) throw new Error("Webhook signing secret must use this workspace's secret namespace.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.insert(webhookConfigurations).values({ workspaceId: workspace.id, endpoint, signingSecretReference: input.signingSecretReference || null, eventTypes: JSON.stringify(eventTypes), endpointConfirmed: input.endpointConfirmed ? 1 : 0, enabled: 0, createdByUserId: ownerUserId }).onDuplicateKeyUpdate({ set: { endpoint, signingSecretReference: input.signingSecretReference || null, eventTypes: JSON.stringify(eventTypes), endpointConfirmed: input.endpointConfirmed ? 1 : 0, enabled: 0, updatedAt: new Date() } });
  await addAudit(workspace.id, "webhook", "webhook-draft-saved", { endpointHost: new URL(endpoint).hostname, eventTypes, endpointConfirmed: input.endpointConfirmed, enabled: false });
  return { success: true, enabled: false as const };
}

export async function createAuditArchive(ownerUserId: number, workspaceId: number) {
  const workspace = await ownedWorkspaceOrThrow(ownerUserId, workspaceId);
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  if (!ENV.archiveSigningSecret) throw new Error("Archive signing secret is unavailable.");
  const [events, evidence, runRows, approvalRows, notificationRows] = await Promise.all([
    db.select().from(auditEvents).where(eq(auditEvents.workspaceId, workspace.id)).orderBy(desc(auditEvents.createdAt)),
    db.select().from(evidenceArtifacts).where(eq(evidenceArtifacts.workspaceId, workspace.id)).orderBy(desc(evidenceArtifacts.createdAt)),
    db.select().from(runs).where(eq(runs.workspaceId, workspace.id)).orderBy(desc(runs.createdAt)),
    db.select().from(approvals).where(eq(approvals.workspaceId, workspace.id)).orderBy(desc(approvals.createdAt)),
    db.select().from(notifications).where(eq(notifications.workspaceId, workspace.id)).orderBy(desc(notifications.createdAt)),
  ]);
  const manifestJson = JSON.stringify({ schema: "angelmind.audit-archive.v1", workspaceId: workspace.id, generatedAt: new Date().toISOString(), auditEvents: events, evidence, runs: runRows, approvals: approvalRows, notifications: notificationRows });
  const manifestHash = sha256(manifestJson);
  const signature = signArchiveManifest(manifestHash, ENV.archiveSigningSecret);
  const immutableBatchKey = `workspace:${workspace.id}:audit:${manifestHash}`;
  const retentionUntil = new Date(Date.now() + workspace.retentionDays * 86_400_000);
  const stored = await storagePut(`workspace-${workspace.id}/audit-archives/${Date.now()}-manifest.json`, manifestJson, "application/json");
  await db.insert(auditArchives).values({ workspaceId: workspace.id, storageKey: stored.key, storageReference: stored.url, manifestHash, signature, immutableBatchKey, retentionUntil, createdByUserId: ownerUserId });
  await addAudit(workspace.id, "audit-archive", "archive-created", { manifestHash, storageReference: stored.url, recordCounts: { events: events.length, evidence: evidence.length, runs: runRows.length, approvals: approvalRows.length, notifications: notificationRows.length } });
  return { storageReference: stored.url, manifestHash };
}

export async function listAuditArchives(userId: number, workspaceId: number) {
  await workspaceAccessOrThrow(userId, workspaceId, "read");
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditArchives).where(eq(auditArchives.workspaceId, workspaceId)).orderBy(desc(auditArchives.createdAt));
}

export async function restoreAuditArchivePlan(ownerUserId: number, archiveId: number, destinationWorkspaceId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [archive] = await db.select().from(auditArchives).where(eq(auditArchives.id, archiveId)).limit(1);
  if (!archive) throw new Error("Audit archive tidak ditemukan.");
  await workspaceAccessOrThrow(ownerUserId, archive.workspaceId, "review");
  const destinationId = destinationWorkspaceId ?? archive.workspaceId;
  await workspaceAccessOrThrow(ownerUserId, destinationId, "review");
  if (!ENV.archiveSigningSecret) throw new Error("Archive signing secret is unavailable.");
  const url = await storageGetSignedUrl(archive.storageKey);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Archive could not be retrieved from managed storage.");
  const manifestJson = await response.text();
  const valid = verifyArchiveIntegrity(manifestJson, archive.manifestHash, archive.signature, ENV.archiveSigningSecret);
  if (!valid) throw new Error("Archive integrity verification failed; restore plan refused.");
  const manifest = assertArchiveManifest(manifestJson, archive.workspaceId) as { schema?: unknown; workspaceId?: unknown; auditEvents?: unknown[]; evidence?: unknown[]; runs?: unknown[]; approvals?: unknown[]; notifications?: unknown[] };
  return { archiveId, workspaceId: archive.workspaceId, destinationWorkspaceId: destinationId, valid: true as const, requiresHumanConfirmation: true as const, recordCounts: { auditEvents: manifest.auditEvents?.length ?? 0, evidence: manifest.evidence?.length ?? 0, runs: manifest.runs?.length ?? 0, approvals: manifest.approvals?.length ?? 0, notifications: manifest.notifications?.length ?? 0 }, mode: "plan-only" as const };
}

export async function verifyAuditArchive(ownerUserId: number, archiveId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [archive] = await db.select().from(auditArchives).where(eq(auditArchives.id, archiveId)).limit(1);
  if (!archive) throw new Error("Audit archive tidak ditemukan.");
  await workspaceAccessOrThrow(ownerUserId, archive.workspaceId, "review");
  if (!ENV.archiveSigningSecret) throw new Error("Archive signing secret is unavailable.");
  const url = await storageGetSignedUrl(archive.storageKey);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Archive could not be retrieved from managed storage.");
  const manifestJson = await response.text();
  const valid = verifyArchiveIntegrity(manifestJson, archive.manifestHash, archive.signature, ENV.archiveSigningSecret);
  if (valid) await db.update(auditArchives).set({ verifiedAt: new Date() }).where(eq(auditArchives.id, archive.id));
  await addAudit(archive.workspaceId, "audit-archive", "archive-verified", { archiveId: archive.id, valid, retentionUntil: archive.retentionUntil.toISOString() });
  return { valid, manifestHash: archive.manifestHash, retentionUntil: archive.retentionUntil };
}


export async function runAuditArchiveDrill(ownerUserId: number, archiveId: number, destinationWorkspaceId?: number, idempotencyKey = `restore-drill:${archiveId}:${Date.now()}`) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const key = normalizeIdempotencyKey(idempotencyKey);
  const [archive] = await db.select().from(auditArchives).where(eq(auditArchives.id, archiveId)).limit(1);
  if (!archive) throw new Error("Audit archive tidak ditemukan.");
  await workspaceAccessOrThrow(ownerUserId, archive.workspaceId, "review");
  const [existing] = await db.select().from(restoreDrillRuns).where(and(eq(restoreDrillRuns.archiveId, archiveId), eq(restoreDrillRuns.idempotencyKey, key))).limit(1);
  if (existing) {
    if (existing.status === "running") throw new Error("A restore drill with this idempotency key is already running.");
    if (existing.status === "failed") throw new Error(existing.errorMessage || "The previous restore drill failed; use a new key.");
    return { archiveId, valid: existing.valid === 1, mode: "plan-only" as const, requiresHumanConfirmation: true as const, recordsChecked: JSON.parse(existing.recordsChecked), mutationPerformed: false as const, rollbackRequired: false as const, replayed: true as const };
  }
  try {
    await db.insert(restoreDrillRuns).values({ archiveId, workspaceId: archive.workspaceId, requestedByUserId: ownerUserId, idempotencyKey: key, status: "running", recordsChecked: JSON.stringify({}) });
  } catch {
    const [concurrent] = await db.select().from(restoreDrillRuns).where(and(eq(restoreDrillRuns.archiveId, archiveId), eq(restoreDrillRuns.idempotencyKey, key))).limit(1);
    if (!concurrent || concurrent.status === "running") throw new Error("A restore drill with this idempotency key is already running.");
    if (concurrent.status === "failed") throw new Error(concurrent.errorMessage || "The previous restore drill failed; use a new key.");
    return { archiveId, valid: concurrent.valid === 1, mode: "plan-only" as const, requiresHumanConfirmation: true as const, recordsChecked: JSON.parse(concurrent.recordsChecked), mutationPerformed: false as const, rollbackRequired: false as const, replayed: true as const };
  }
  try {
    const verification = await verifyAuditArchive(ownerUserId, archiveId);
    if (!verification.valid) throw new Error("DR drill refused because archive integrity is invalid.");
    const plan = await restoreAuditArchivePlan(ownerUserId, archiveId, destinationWorkspaceId);
    await db.update(auditArchives).set({ lastRestoreDrillAt: new Date() }).where(eq(auditArchives.id, archiveId));
    await db.update(restoreDrillRuns).set({ status: "completed", valid: 1, recordsChecked: JSON.stringify(plan.recordCounts), completedAt: new Date() }).where(and(eq(restoreDrillRuns.archiveId, archiveId), eq(restoreDrillRuns.idempotencyKey, key)));
    return { archiveId, valid: plan.valid, mode: "plan-only" as const, requiresHumanConfirmation: plan.requiresHumanConfirmation, recordsChecked: plan.recordCounts, mutationPerformed: false as const, rollbackRequired: false as const, replayed: false as const };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 2_000) : "Restore drill failed.";
    await db.update(restoreDrillRuns).set({ status: "failed", errorMessage: message, completedAt: new Date() }).where(and(eq(restoreDrillRuns.archiveId, archiveId), eq(restoreDrillRuns.idempotencyKey, key)));
    throw error;
  }
}
