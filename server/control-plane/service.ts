import { createHash } from "crypto";
import { and, desc, eq, gt, inArray, isNotNull, isNull } from "drizzle-orm";
import { auditEvents, approvals, credentialReferences, evidenceArtifacts, findings, notificationPreferences, notifications, runs, workspaceChangeSnapshots, workspaceMemberships, workspaces } from "../../drizzle/schema";
import { getDb, getOwnedWorkspace } from "../db";
import { notifyOwner } from "../_core/notification";
import { storageGetSignedUrl, storagePut } from "../storage";
import { assertFindingTransition, type FindingWorkflowStatus } from "./finding-workflow";
import { buildRehearsal } from "./rehearsal";
import { getAdministrativeCheckEligibility } from "./scheduler";
import { getRunEligibility } from "./run-eligibility";
import { assertDistinctApprover, canReviewApproval, prepareGovernanceRequest } from "./governance";
import { canAcknowledgeNotification, planInAppDelivery, type NotificationEvent, type NotificationSeverity } from "./notifications";
import { canAccessWorkspace, ensureOwnerMembership, getReadableWorkspaceIds, getReviewerWorkspaceIds, hasReviewerMembership } from "./operations";
import { escalateOverdueIncidentsForWorkspace } from "./assurance";
import type { ActionKind } from "./contracts";
import { validateEvidenceBytes } from "./evidence-validation";
import { upsertSearchDocument } from "../global-search";
import { currentTraceContext } from "../_core/trace-context";
import { enqueueJob } from "../ai-platform";
import { scanEvidenceContent } from "../evidence-scanner";

const parseList = (serialized: string): string[] => {
  try {
    const parsed = JSON.parse(serialized);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
};

const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function addAudit(workspaceId: number, category: string, subject: string, details: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return;
  const traceId = currentTraceContext()?.traceId ?? null;
  await db.insert(auditEvents).values({
    workspaceId,
    category,
    subject,
    traceId,
    evidenceHash: digest({ workspaceId, category, subject, details, traceId }),
    details: JSON.stringify(details),
  });
}

async function ownedWorkspaceOrThrow(userId: number, workspaceId: number) {
  const workspace = await getOwnedWorkspace(workspaceId, userId);
  if (!workspace) throw new Error("Workspace tidak ditemukan atau tidak dapat diakses.");
  return workspace;
}

async function readableWorkspaceIdOrThrow(userId: number, workspaceId: number) {
  if (!await canAccessWorkspace(userId, workspaceId, "read")) throw new Error("Workspace tidak ditemukan atau tidak dapat diakses.");
  return workspaceId;
}

async function createInAppNotification(input: { userId: number; workspaceId: number; eventType: NotificationEvent; severity: NotificationSeverity; title: string; message: string }) {
  const db = await getDb();
  if (!db) return { delivered: false, reason: "database-unavailable" as const };
  const preferences = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, input.userId));
  const delivery = planInAppDelivery(input.eventType, preferences);
  if (!delivery.delivered) {
    await addAudit(input.workspaceId, "notification", delivery.auditSubject, { eventType: input.eventType, userId: input.userId, reason: "preference-disabled" });
    return { delivered: false, reason: "preference-disabled" as const };
  }
  await db.insert(notifications).values(input);
  await addAudit(input.workspaceId, "notification", delivery.auditSubject, { eventType: input.eventType, userId: input.userId, severity: input.severity });
  return { delivered: true as const };
}

export async function emitControlPlaneNotification(input: { userId: number; workspaceId: number; eventType: NotificationEvent; severity: NotificationSeverity; title: string; message: string }) {
  return createInAppNotification(input);
}

async function notifyWorkspaceOwner(workspace: { id: number; ownerUserId: number; name: string }, input: { eventType: NotificationEvent; severity: NotificationSeverity; title: string; message: string }) {
  await createInAppNotification({ userId: workspace.ownerUserId, workspaceId: workspace.id, ...input });
  await notifyOwner({ title: input.title, content: input.message }).catch(() => false);
}

export async function listWorkspaces(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workspaces).where(eq(workspaces.ownerUserId, userId)).orderBy(desc(workspaces.updatedAt));
}

export async function createWorkspace(userId: number, input: {
  name: string;
  programName: string;
  safeHarbor: string;
  codeOfConduct: string;
  allowlist: string[];
  exclusions: string[];
  budgetCents: number;
  sessionLimitMinutes: number;
  cooldownMinutes: number;
  retentionDays: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const allowlist = input.allowlist.map(item => item.trim()).filter(Boolean);
  const exclusions = input.exclusions.map(item => item.trim()).filter(Boolean);
  if (!input.safeHarbor.trim() || !input.codeOfConduct.trim() || allowlist.length === 0) {
    throw new Error("Safe harbor, code of conduct, dan minimal satu scope allowlist wajib diisi.");
  }
  await db.insert(workspaces).values({
    ownerUserId: userId,
    name: input.name.trim(),
    programName: input.programName.trim(),
    safeHarbor: input.safeHarbor.trim(),
    codeOfConduct: input.codeOfConduct.trim(),
    allowlist: JSON.stringify(allowlist),
    exclusions: JSON.stringify(exclusions),
    budgetCents: input.budgetCents,
    sessionLimitMinutes: input.sessionLimitMinutes,
    cooldownMinutes: input.cooldownMinutes,
    retentionDays: input.retentionDays,
  });
  const [created] = await db.select().from(workspaces).where(and(eq(workspaces.ownerUserId, userId), eq(workspaces.name, input.name.trim()))).orderBy(desc(workspaces.id)).limit(1);
  if (created) {
    await ensureOwnerMembership(created.id, userId);
    await addAudit(created.id, "workspace", "workspace-created", { name: input.name, programName: input.programName });
  }
  return { success: true };
}

export async function setWorkspaceStatus(userId: number, workspaceId: number, status: "active" | "paused" | "archived") {
  const workspace = await ownedWorkspaceOrThrow(userId, workspaceId);
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.update(workspaces).set({ status }).where(eq(workspaces.id, workspace.id));
  await addAudit(workspace.id, "workspace", "workspace-status", { status });
  return { success: true };
}

export async function getToolExecutionContext(userId: number, workspaceId: number) {
  const workspace = await ownedWorkspaceOrThrow(userId, workspaceId);
  const eligibility = getRunEligibility(workspace);
  if (!eligibility.eligible) return { allowed: false as const, reason: eligibility.reason };
  const allowlist = parseList(workspace.allowlist);
  const exclusions = parseList(workspace.exclusions);
  return {
    allowed: true as const,
    workspaceId: workspace.id,
    allowlist,
    exclusions,
    scopeDigest: digest({ allowlist, exclusions, safeHarbor: workspace.safeHarbor, codeOfConduct: workspace.codeOfConduct }),
  };
}

export async function rehearseWorkspace(userId: number, workspaceId: number) {
  const workspace = await ownedWorkspaceOrThrow(userId, workspaceId);
  const eligibility = getRunEligibility(workspace);
  if (!eligibility.eligible) {
    await addAudit(workspace.id, "policy-block", "dry-run-start", { reason: eligibility.reason });
    await notifyWorkspaceOwner(workspace, { eventType: "guardrail_blocked", severity: "warning", title: "AngelMind rehearsal diblokir", message: `Workspace ${workspace.name} tidak dapat memulai rehearsal: ${eligibility.reason}.` });
    throw new Error(`Rehearsal diblokir oleh guardrail: ${eligibility.reason}.`);
  }
  const allowlist = parseList(workspace.allowlist);
  const exclusions = parseList(workspace.exclusions);
  const target = allowlist[0] ?? "";
  const rehearsal = buildRehearsal({
    target,
    allowlist,
    exclusions,
    safeHarbor: workspace.safeHarbor,
    codeOfConduct: workspace.codeOfConduct,
    spentCents: workspace.spentCents,
    budgetCents: workspace.budgetCents,
    sessionLimitMinutes: workspace.sessionLimitMinutes,
  });
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.insert(runs).values({
    workspaceId: workspace.id,
    mode: "dry_run",
    status: rehearsal.policy.allowed ? "completed" : "blocked",
    governanceTier: rehearsal.policy.tier,
    plannedTaskCount: rehearsal.taskCount,
    estimatedCostCents: rehearsal.estimatedCostCents,
    estimatedDurationMinutes: rehearsal.estimatedDurationMinutes,
    eventLog: JSON.stringify({ kind: "dry-run", networkCalls: 0, toolExecutions: 0, reasons: rehearsal.policy.reasons }),
    checkpoint: JSON.stringify(rehearsal.checkpoint),
    completedAt: new Date(),
  });
  await db.update(workspaces).set({ lastRunAt: new Date() }).where(eq(workspaces.id, workspace.id));
  await addAudit(workspace.id, rehearsal.policy.allowed ? "rehearsal" : "policy-block", "dry-run", rehearsal);
  if (!rehearsal.policy.allowed) {
    await notifyWorkspaceOwner(workspace, { eventType: "guardrail_blocked", severity: "warning", title: "AngelMind guardrail memblokir rehearsal", message: `Workspace ${workspace.name} diblokir: ${rehearsal.policy.reasons.join(" ")}` });
  }
  return rehearsal;
}

export async function requestApproval(userId: number, workspaceId: number, action: ActionKind) {
  const workspace = await ownedWorkspaceOrThrow(userId, workspaceId);
  const governance = prepareGovernanceRequest(action);
  if (governance.status !== "pending") throw new Error("Hanya aksi Tier 3 yang masuk ke antrean approval manusia.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.insert(approvals).values({ workspaceId: workspace.id, actionName: action, tier: governance.tier, requestedByUserId: userId, status: "pending" });
  await addAudit(workspace.id, "governance", "tier3-requested", { ...governance, outcome: "blocked-pending-human" });
  await notifyWorkspaceOwner(workspace, { eventType: "approval_required", severity: "critical", title: "AngelMind memerlukan approval manusia", message: `Aksi Tier 3 “${action}” pada workspace ${workspace.name} diblokir dan menunggu keputusan manusia. Tidak ada aksi target yang dijalankan.` });
  return { success: true, status: "pending" as const };
}

export async function listApprovals(userId: number, userRole: "user" | "admin") {
  const db = await getDb();
  if (!db) return [];
  if (userRole === "admin") return db.select().from(approvals).orderBy(desc(approvals.createdAt));
  const owned = await listWorkspaces(userId);
  const reviewerWorkspaceIds = await getReviewerWorkspaceIds(userId);
  const ownedWorkspaceIds = owned.map(workspace => workspace.id);
  const workspaceIds = ownedWorkspaceIds.concat(reviewerWorkspaceIds.filter(workspaceId => !ownedWorkspaceIds.includes(workspaceId)));
  if (workspaceIds.length === 0) return [];
  return db.select().from(approvals).where(inArray(approvals.workspaceId, workspaceIds)).orderBy(desc(approvals.createdAt));
}

export async function decideApproval(userId: number, userRole: "user" | "admin", approvalId: number, decision: "approved" | "rejected", note: string) {
  const allApprovals = await listApprovals(userId, userRole);
  const approval = allApprovals.find(item => item.id === approvalId);
  if (!approval) throw new Error("Approval tidak ditemukan atau tidak dapat diakses.");
  if (approval.status !== "pending") throw new Error("Approval ini sudah memiliki keputusan.");
  const reviewerMembership = userRole === "admin" ? false : await hasReviewerMembership(userId, approval.workspaceId);
  if (!canReviewApproval(userRole, approval.requestedByUserId, userId, reviewerMembership)) throw new Error("Tier 3 approval requires a distinct administrator or delegated reviewer.");
  assertDistinctApprover(approval.requestedByUserId, userId);
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.update(approvals).set({ status: decision, decidedByUserId: userId, decisionNote: note.trim() || null, decidedAt: new Date() }).where(eq(approvals.id, approval.id));
  await addAudit(approval.workspaceId, "governance", "tier3-decision", { approvalId, decision, note, execution: "blocked-by-safety-boundary", message: "Approval records the human decision only; no target-facing execution is performed." });
  return { success: true };
}

export async function listFindings(userId: number, workspaceId?: number) {
  const workspaceIds = workspaceId ? [await readableWorkspaceIdOrThrow(userId, workspaceId)] : await getReadableWorkspaceIds(userId);
  if (workspaceIds.length === 0) return [];
  const db = await getDb();
  if (!db) return [];
  return db.select().from(findings).where(inArray(findings.workspaceId, workspaceIds)).orderBy(desc(findings.updatedAt));
}

export async function listCredentialReferences(userId: number, workspaceId: number) {
  await ownedWorkspaceOrThrow(userId, workspaceId);
  const db = await getDb();
  if (!db) return [];
  return db.select().from(credentialReferences).where(eq(credentialReferences.workspaceId, workspaceId));
}

export async function addCredentialReference(userId: number, workspaceId: number, label: string, secretReference: string) {
  const workspace = await ownedWorkspaceOrThrow(userId, workspaceId);
  const expectedPrefix = `secret://workspace-${workspace.id}/`;
  if (!secretReference.startsWith(expectedPrefix)) throw new Error(`Secret reference must start with ${expectedPrefix}; secret values are never accepted.`);
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.insert(credentialReferences).values({ workspaceId: workspace.id, label: label.trim(), secretReference: secretReference.trim() });
  await addAudit(workspace.id, "credential", "credential-reference-added", { label: label.trim(), secretReference: secretReference.trim() });
  return { success: true };
}

export async function createFinding(userId: number, input: { workspaceId: number; fingerprint: string; title: string; impactSummary: string; reportDraft: string; confidence: number }) {
  const workspace = await ownedWorkspaceOrThrow(userId, input.workspaceId);
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [duplicate] = await db.select().from(findings).where(and(eq(findings.workspaceId, workspace.id), eq(findings.fingerprint, input.fingerprint.trim()))).limit(1);
  if (duplicate) throw new Error("Fingerprint sudah ada pada workspace ini; kandidat ditandai sebagai duplikat dan tidak dibuat ulang.");
  await db.insert(findings).values({
    workspaceId: workspace.id,
    fingerprint: input.fingerprint.trim(),
    title: input.title.trim(),
    confidence: input.confidence,
    impactSummary: input.impactSummary.trim(),
    reportDraft: input.reportDraft.trim(),
    status: "discovered",
    humanReviewStatus: "pending",
  });
  const [createdFinding] = await db.select().from(findings).where(and(eq(findings.workspaceId, workspace.id), eq(findings.fingerprint, input.fingerprint.trim()))).limit(1);
  if (createdFinding) await upsertSearchDocument({ workspaceId: workspace.id, entityType: "finding", entityId: createdFinding.id, title: createdFinding.title, body: createdFinding.impactSummary });
  await addAudit(workspace.id, "finding", "finding-discovered", { fingerprint: input.fingerprint.trim(), title: input.title.trim(), confidence: input.confidence });
  return { success: true };
}

export async function approveFindingReview(userId: number, findingId: number) {
  const owned = await listWorkspaces(userId);
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [finding] = await db.select().from(findings).where(and(eq(findings.id, findingId), inArray(findings.workspaceId, owned.map(workspace => workspace.id)))).limit(1);
  if (!finding) throw new Error("Finding tidak ditemukan atau tidak dapat diakses.");
  if (finding.status !== "validated") throw new Error("Human review hanya dapat direkam setelah finding mencapai status validated.");
  await db.update(findings).set({ humanReviewStatus: "approved" }).where(eq(findings.id, finding.id));
  await addAudit(finding.workspaceId, "finding-review", "human-review-approved", { findingId: finding.id });
  return { success: true };
}

export async function transitionFinding(userId: number, input: { findingId: number; status: FindingWorkflowStatus }) {
  const owned = await listWorkspaces(userId);
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [finding] = await db.select().from(findings).where(and(eq(findings.id, input.findingId), inArray(findings.workspaceId, owned.map(workspace => workspace.id)))).limit(1);
  if (!finding) throw new Error("Finding tidak ditemukan atau tidak dapat diakses.");
  assertFindingTransition(finding.status as FindingWorkflowStatus, input.status, finding.humanReviewStatus === "approved");
  await db.update(findings).set({ status: input.status }).where(eq(findings.id, finding.id));
  await addAudit(finding.workspaceId, "finding", "finding-transition", { findingId: finding.id, from: finding.status, to: input.status });
  if (input.status === "validated") {
    const workspace = await ownedWorkspaceOrThrow(userId, finding.workspaceId);
    await notifyWorkspaceOwner(workspace, { eventType: "finding_validated", severity: "info", title: "AngelMind finding tervalidasi", message: `Finding “${finding.title}” di workspace #${finding.workspaceId} memasuki status validated dan menunggu human review.` });
  }
  return { success: true };
}

export async function uploadEvidence(userId: number, input: { workspaceId: number; findingId?: number; fileName: string; contentType: string; contentBase64: string }) {
  const workspace = await ownedWorkspaceOrThrow(userId, input.workspaceId);
  const bytes = Buffer.from(input.contentBase64, "base64");
  if (bytes.length === 0 || bytes.length > 5_000_000) throw new Error("Evidence file must be between 1 byte and 5 MB.");
  if (input.findingId) {
    const currentFindings = await listFindings(userId, workspace.id);
    if (!currentFindings.some(finding => finding.id === input.findingId)) throw new Error("Finding evidence tidak berada pada workspace ini.");
  }
  const cleanName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "evidence.bin";
  const validatedEvidence = validateEvidenceBytes({ contentType: input.contentType, fileName: cleanName, bytes });
  const artifact = await storagePut(`workspace-${workspace.id}/evidence/${Date.now()}-${cleanName}`, bytes, validatedEvidence.contentType);
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const traceId = currentTraceContext()?.traceId ?? null;
  const storageKey = artifact.key;
  await db.insert(evidenceArtifacts).values({ workspaceId: workspace.id, findingId: input.findingId ?? null, artifactType: validatedEvidence.contentType, contentType: validatedEvidence.contentType, sizeBytes: bytes.length, storageKey, storageReference: storageKey, sha256: createHash("sha256").update(bytes).digest("hex"), status: "quarantined", quarantineReason: "Awaiting content/security scan.", traceId });
  const [storedArtifact] = await db.select().from(evidenceArtifacts).where(and(eq(evidenceArtifacts.workspaceId, workspace.id), eq(evidenceArtifacts.storageKey, storageKey))).orderBy(desc(evidenceArtifacts.id)).limit(1);
  if (!storedArtifact) throw new Error("Evidence artifact could not be persisted.");
  await enqueueJob(userId, { workspaceId: workspace.id, kind: "evidence.scan", idempotencyKey: `evidence-scan:${storedArtifact.id}`, payload: { type: "evidence_scan", artifactId: storedArtifact.id, storageKey, contentType: validatedEvidence.contentType, fileName: cleanName } });
  await addAudit(workspace.id, "evidence", "artifact-stored", { fileName: cleanName, contentType: validatedEvidence.contentType, storageKey, findingId: input.findingId ?? null, scanJobIdempotencyKey: `evidence-scan:${storedArtifact.id}` });
  return { storageReference: artifact.url, storageKey, artifactId: storedArtifact.id, status: storedArtifact.status };
}

export async function executeEvidenceScanJob(payload: Record<string, unknown>) {
  const artifactId = Number(payload.artifactId);
  const payloadStorageKey = String(payload.storageKey ?? "").trim();
  const legacyStorageReference = String(payload.storageReference ?? "").trim();
  const contentType = String(payload.contentType ?? "application/octet-stream");
  const fileName = String(payload.fileName ?? "evidence.bin");
  if (!Number.isInteger(artifactId) || artifactId < 1 || (!payloadStorageKey && !legacyStorageReference.startsWith("http"))) throw new Error("Invalid evidence scan job payload.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [artifact] = await db.select().from(evidenceArtifacts).where(eq(evidenceArtifacts.id, artifactId)).limit(1);
  if (!artifact || artifact.status !== "quarantined") return;
  const storageKey = artifact.storageKey || payloadStorageKey;
  const downloadUrl = storageKey ? await storageGetSignedUrl(storageKey, 300) : legacyStorageReference;
  const response = await fetch(downloadUrl);
  if (!response.ok) throw new Error(`Evidence download failed with HTTP ${response.status}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const result = scanEvidenceContent({ bytes, contentType, fileName });
  await db.update(evidenceArtifacts).set({ status: result.passed ? "scanned" : "rejected", scannedAt: new Date(), quarantineReason: result.passed ? null : result.reason }).where(and(eq(evidenceArtifacts.id, artifact.id), eq(evidenceArtifacts.status, "quarantined")));
  await addAudit(artifact.workspaceId, "evidence", result.passed ? "artifact-auto-scanned" : "artifact-auto-rejected", { evidenceArtifactId: artifact.id, scanner: result.scanner, reason: result.reason });
}

export async function markEvidenceScanned(userId: number, evidenceArtifactId: number, scanPassed: boolean, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [artifact] = await db.select().from(evidenceArtifacts).where(eq(evidenceArtifacts.id, evidenceArtifactId)).limit(1);
  if (!artifact || !(await canAccessWorkspace(userId, artifact.workspaceId, "review"))) throw new Error("Evidence tidak ditemukan atau reviewer permission diperlukan.");
  const status = scanPassed ? "scanned" : "rejected";
  await db.update(evidenceArtifacts).set({ status, scannedAt: new Date(), quarantineReason: scanPassed ? null : (reason?.trim().slice(0, 2_000) || "Security scan rejected artifact.") }).where(eq(evidenceArtifacts.id, artifact.id));
  await addAudit(artifact.workspaceId, "evidence", scanPassed ? "artifact-scanned" : "artifact-rejected", { evidenceArtifactId: artifact.id, reason: reason?.trim() || null });
  return { success: true as const, evidenceArtifactId: artifact.id, status };
}

export async function promoteEvidence(userId: number, evidenceArtifactId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [artifact] = await db.select().from(evidenceArtifacts).where(eq(evidenceArtifacts.id, evidenceArtifactId)).limit(1);
  if (!artifact || !(await canAccessWorkspace(userId, artifact.workspaceId, "review"))) throw new Error("Evidence tidak ditemukan atau reviewer permission diperlukan.");
  if (artifact.status !== "scanned") throw new Error("Evidence must pass a security scan before promotion.");
  await db.update(evidenceArtifacts).set({ status: "promoted", promotedAt: new Date(), quarantineReason: null }).where(eq(evidenceArtifacts.id, artifact.id));
  await addAudit(artifact.workspaceId, "evidence", "artifact-promoted", { evidenceArtifactId: artifact.id });
  return { success: true as const, evidenceArtifactId: artifact.id, status: "promoted" as const };
}

export async function listAudit(userId: number, workspaceId: number) {
  await readableWorkspaceIdOrThrow(userId, workspaceId);
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditEvents).where(eq(auditEvents.workspaceId, workspaceId)).orderBy(desc(auditEvents.createdAt)).limit(100);
}

export async function listNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(100);
}

export async function listNotificationsSince(userId: number, input: { afterId?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const limit = Math.min(100, Math.max(1, input.limit ?? 50));
  const condition = input.afterId && input.afterId > 0 ? and(eq(notifications.userId, userId), gt(notifications.id, input.afterId)) : eq(notifications.userId, userId);
  return db.select().from(notifications).where(condition).orderBy(notifications.id).limit(limit);
}

export async function listNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId));
}

export async function setNotificationPreference(userId: number, eventType: NotificationEvent, inAppEnabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.insert(notificationPreferences).values({ userId, eventType, inAppEnabled: inAppEnabled ? 1 : 0 }).onDuplicateKeyUpdate({ set: { inAppEnabled: inAppEnabled ? 1 : 0, updatedAt: new Date() } });
  return { success: true };
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [notification] = await db.select().from(notifications).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId))).limit(1);
  if (!notification) throw new Error("Notifikasi tidak ditemukan atau tidak dapat diakses.");
  if (!canAcknowledgeNotification(notification.userId, userId)) throw new Error("Notifikasi hanya dapat diakui oleh penerima.");
  await db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.id, notification.id));
  return { success: true };
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return { success: true };
}

export async function getDashboard(userId: number) {
  const owned = await listWorkspaces(userId);
  const workspaceIds = owned.map(workspace => workspace.id);
  if (workspaceIds.length === 0) {
    return { workspaces: [], activeWorkspaceCount: 0, pendingApprovalCount: 0, policyBlockCount: 0, runCount: 0, validatedFindingCount: 0, estimatedSpendCents: 0, errorCount: 0, modelUseCount: 0, falsePositiveRate: null as number | null, reproductionRate: null as number | null, controlCoverage: 0, recentRuns: [] as Awaited<ReturnType<typeof listRuns>> };
  }
  const db = await getDb();
  if (!db) return { workspaces: owned, activeWorkspaceCount: 0, pendingApprovalCount: 0, policyBlockCount: 0, runCount: 0, validatedFindingCount: 0, estimatedSpendCents: 0, errorCount: 0, modelUseCount: 0, falsePositiveRate: null as number | null, reproductionRate: null as number | null, controlCoverage: 0, recentRuns: [] as Awaited<ReturnType<typeof listRuns>> };
  const [approvalRows, runRows, findingRows, auditRows] = await Promise.all([
    db.select().from(approvals).where(inArray(approvals.workspaceId, workspaceIds)),
    db.select().from(runs).where(inArray(runs.workspaceId, workspaceIds)).orderBy(desc(runs.createdAt)),
    db.select().from(findings).where(inArray(findings.workspaceId, workspaceIds)),
    db.select().from(auditEvents).where(inArray(auditEvents.workspaceId, workspaceIds)),
  ]);
  const resolvedFindings = findingRows.filter(finding => ["invalid", "inconclusive", "validated", "reported"].includes(finding.status));
  const confirmedFindings = findingRows.filter(finding => ["validated", "reported"].includes(finding.status));
  const invalidFindings = findingRows.filter(finding => finding.status === "invalid");
  return {
    workspaces: owned,
    activeWorkspaceCount: owned.filter(workspace => workspace.status === "active").length,
    pendingApprovalCount: approvalRows.filter(approval => approval.status === "pending").length,
    policyBlockCount: auditRows.filter(event => event.category === "policy-block").length,
    runCount: runRows.length,
    validatedFindingCount: confirmedFindings.length,
    estimatedSpendCents: owned.reduce((sum, workspace) => sum + workspace.spentCents, 0),
    errorCount: auditRows.filter(event => event.category === "error").length,
    modelUseCount: auditRows.filter(event => event.category === "model-use").length,
    falsePositiveRate: resolvedFindings.length ? Math.round((invalidFindings.length / resolvedFindings.length) * 100) : null,
    reproductionRate: resolvedFindings.length ? Math.round((confirmedFindings.length / resolvedFindings.length) * 100) : null,
    controlCoverage: owned.length ? Math.round((owned.filter(workspace => Boolean(workspace.safeHarbor && workspace.codeOfConduct && parseList(workspace.allowlist).length)).length / owned.length) * 100) : 0,
    recentRuns: runRows.slice(0, 8),
  };
}

export async function listRuns(userId: number, workspaceId?: number) {
  const workspaceIds = workspaceId ? [await readableWorkspaceIdOrThrow(userId, workspaceId)] : await getReadableWorkspaceIds(userId);
  if (workspaceIds.length === 0) return [];
  const db = await getDb();
  if (!db) return [];
  return db.select().from(runs).where(inArray(runs.workspaceId, workspaceIds)).orderBy(desc(runs.createdAt)).limit(40);
}

export async function getWorkspaceByScheduleTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.scheduleCronTaskUid, taskUid)).limit(1);
  return workspace;
}

export async function runScheduledAdministrativeCheck(taskUid: string) {
  const workspace = await getWorkspaceByScheduleTaskUid(taskUid);
  if (!workspace) return { ok: true, skipped: "orphan" as const };
  const eligibility = getAdministrativeCheckEligibility(workspace);
  if (!eligibility.eligible && eligibility.reason === "workspace-not-active") return { ok: true, skipped: "workspace-not-active" as const };
  if (!eligibility.eligible && eligibility.reason === "cooldown") return { ok: true, skipped: "cooldown" as const };
  if (!eligibility.eligible && eligibility.reason === "session-limit") return { ok: true, skipped: "session-limit" as const };
  if (!eligibility.eligible && eligibility.reason === "budget") {
    await addAudit(workspace.id, "policy-block", "scheduled-administrative-check", { reason: "budget-ceiling" });
    await notifyWorkspaceOwner(workspace, { eventType: "guardrail_blocked", severity: "warning", title: "AngelMind scheduled check diblokir", message: `Workspace ${workspace.name} melampaui batas anggaran.` });
    return { ok: true, skipped: "budget" as const };
  }
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const configurationDigest = digest({ allowlist: workspace.allowlist, exclusions: workspace.exclusions, safeHarbor: workspace.safeHarbor, codeOfConduct: workspace.codeOfConduct, budgetCents: workspace.budgetCents, retentionDays: workspace.retentionDays, status: workspace.status });
  const [snapshot] = await db.select().from(workspaceChangeSnapshots).where(eq(workspaceChangeSnapshots.workspaceId, workspace.id)).limit(1);
  const changed = Boolean(snapshot && snapshot.configurationDigest !== configurationDigest);
  if (snapshot) await db.update(workspaceChangeSnapshots).set({ configurationDigest, checkedAt: new Date() }).where(eq(workspaceChangeSnapshots.id, snapshot.id));
  else await db.insert(workspaceChangeSnapshots).values({ workspaceId: workspace.id, configurationDigest });
  const cutoff = new Date(Date.now() - workspace.retentionDays * 24 * 60 * 60 * 1000);
  const artifacts = await db.select().from(evidenceArtifacts).where(eq(evidenceArtifacts.workspaceId, workspace.id));
  const retentionReviewCount = artifacts.filter(artifact => artifact.createdAt < cutoff).length;
  const escalatedIncidentCount = await escalateOverdueIncidentsForWorkspace(workspace);
  await addAudit(workspace.id, "administrative-check", "change-detection", { mode: "metadata-only", networkCalls: 0, changed, retentionReviewCount, result: "No target interaction: configuration digest, retention window, and pending approvals reviewed." });
  await notifyWorkspaceOwner(workspace, { eventType: "scheduled_check", severity: changed || retentionReviewCount > 0 || escalatedIncidentCount > 0 ? "warning" : "info", title: "AngelMind scheduled check selesai", message: `Workspace ${workspace.name}: ${changed ? "configuration change recorded" : "configuration unchanged"}; retention review: ${retentionReviewCount}; incident escalations: ${escalatedIncidentCount}. No target interaction occurred.` });
  return { ok: true, completed: changed ? "metadata-change-recorded" as const : "metadata-unchanged" as const, retentionReviewCount, escalatedIncidentCount };
}

export async function runScheduledAdministrativeChecks() {
  const db = await getDb();
  if (!db) return { ok: false as const, processed: 0, failed: 0, reason: "database-unavailable" as const };

  const scheduled = await db
    .select({ taskUid: workspaces.scheduleCronTaskUid })
    .from(workspaces)
    .where(and(eq(workspaces.status, "active"), isNotNull(workspaces.scheduleCronTaskUid)));

  const taskUids = scheduled
    .map(row => row.taskUid)
    .filter((taskUid): taskUid is string => Boolean(taskUid));
  const results = await Promise.allSettled(taskUids.map(taskUid => runScheduledAdministrativeCheck(taskUid)));
  return {
    ok: true as const,
    processed: results.filter(result => result.status === "fulfilled").length,
    failed: results.filter(result => result.status === "rejected").length,
    results: results.map((result, index) => ({
      taskUid: taskUids[index],
      status: result.status,
      ...(result.status === "fulfilled" ? { result: result.value } : { error: String(result.reason) }),
    })),
  };
}

export async function attachScheduleTask(userId: number, workspaceId: number, taskUid: string) {
  const workspace = await ownedWorkspaceOrThrow(userId, workspaceId);
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.update(workspaces).set({ scheduleCronTaskUid: taskUid }).where(eq(workspaces.id, workspace.id));
  await addAudit(workspace.id, "scheduler", "schedule-attached", { taskUid });
}

export async function listEvidence(userId: number, workspaceId: number) {
  await readableWorkspaceIdOrThrow(userId, workspaceId);
  const db = await getDb();
  if (!db) return [];
  return db.select().from(evidenceArtifacts).where(eq(evidenceArtifacts.workspaceId, workspaceId)).orderBy(desc(evidenceArtifacts.createdAt));
}
