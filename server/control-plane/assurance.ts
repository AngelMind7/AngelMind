import { and, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import { evidenceArtifacts, incidentEvidenceLinks, incidents, notificationPreferences, notifications, policyVersions, webhookActivationRequests, webhookConfigurations, workspaces } from "../../drizzle/schema";
import { getDb, getOwnedWorkspace } from "../db";
import { canAccessWorkspace, getReadableWorkspaceIds, hasReviewerMembership } from "./operations";
import { sha256 } from "./archive-integrity";
import { buildPolicyDiff, canApplyReviewedChange, canLinkIncidentEvidence, getEscalationDueAt, isWebhookActivationReady, type IncidentSeverity } from "./assurance-contracts";
import { planInAppDelivery, type NotificationEvent, type NotificationSeverity } from "./notifications";
import { applyPolicyDecisionWorkflow, applyWebhookReviewWorkflow, preparePolicyVersionWorkflow, prepareWebhookActivationWorkflow, shouldEscalateIncident, transitionIncidentWorkflow } from "./assurance-workflows";

type UserRole = "user" | "admin";

async function ownedWorkspaceOrThrow(userId: number, workspaceId: number) {
  const workspace = await getOwnedWorkspace(workspaceId, userId);
  if (!workspace) throw new Error("Workspace tidak ditemukan atau tidak dapat dikelola.");
  return workspace;
}

async function workspaceOrThrow(workspaceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  if (!workspace) throw new Error("Workspace tidak ditemukan.");
  return workspace;
}

async function addAudit(workspaceId: number, category: string, subject: string, details: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return;
  await db.insert((await import("../../drizzle/schema")).auditEvents).values({ workspaceId, category, subject, details: JSON.stringify(details), evidenceHash: sha256(JSON.stringify({ workspaceId, category, subject, details })) });
}

async function emitWorkspaceSignal(input: { userId: number; workspaceId: number; eventType: NotificationEvent; severity: NotificationSeverity; title: string; message: string }) {
  const db = await getDb();
  if (!db) return;
  const preferences = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, input.userId));
  const delivery = planInAppDelivery(input.eventType, preferences);
  if (delivery.delivered) await db.insert(notifications).values(input);
  await addAudit(input.workspaceId, "notification", delivery.auditSubject, { eventType: input.eventType, userId: input.userId, severity: input.severity, reason: delivery.delivered ? undefined : "preference-disabled" });
}

async function reviewerEligible(userId: number, userRole: UserRole, workspaceId: number, requesterId: number) {
  const member = userRole === "admin" ? true : await hasReviewerMembership(userId, workspaceId);
  return canApplyReviewedChange(requesterId, userId, member);
}

export async function requestPolicyVersion(userId: number, input: { workspaceId: number; safeHarbor: string; codeOfConduct: string; allowlist: string[]; exclusions: string[]; changeSummary: string }) {
  const workspace = await ownedWorkspaceOrThrow(userId, input.workspaceId);
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [latest] = await db.select().from(policyVersions).where(eq(policyVersions.workspaceId, workspace.id)).orderBy(desc(policyVersions.version)).limit(1);
  const content = { safeHarbor: input.safeHarbor.trim(), codeOfConduct: input.codeOfConduct.trim(), allowlist: input.allowlist.map(value => value.trim()).filter(Boolean), exclusions: input.exclusions.map(value => value.trim()).filter(Boolean) };
  if (!content.safeHarbor || !content.codeOfConduct || content.allowlist.length === 0) throw new Error("Policy version needs safe harbor, conduct, and a non-empty allowlist.");
  const baseline = { safeHarbor: workspace.safeHarbor, codeOfConduct: workspace.codeOfConduct, allowlist: JSON.parse(workspace.allowlist) as string[], exclusions: JSON.parse(workspace.exclusions) as string[] };
  const pending = preparePolicyVersionWorkflow(baseline, content, latest?.version ?? 0, userId, input.changeSummary);
  await db.insert(policyVersions).values({ workspaceId: workspace.id, version: pending.version, ...content, allowlist: JSON.stringify(content.allowlist), exclusions: JSON.stringify(content.exclusions), changeSummary: pending.changeSummary, diffJson: JSON.stringify(pending.diff), contentHash: sha256(JSON.stringify(content)), requestedByUserId: userId, status: pending.status });
  await addAudit(workspace.id, "policy", "policy-version-requested", { version: pending.version, contentHash: sha256(JSON.stringify(content)), requestedByUserId: userId });
  await emitWorkspaceSignal({ userId: workspace.ownerUserId, workspaceId: workspace.id, eventType: "policy_review_required", severity: "warning", title: "Policy review diperlukan", message: `Workspace ${workspace.name} memiliki policy version v${pending.version} yang menunggu distinct reviewer approval.` });
  return { success: true, version: pending.version };
}

export async function listPolicyVersions(userId: number, workspaceId?: number) {
  const workspaceIds = workspaceId ? [workspaceId] : await getReadableWorkspaceIds(userId);
  if (workspaceId && !await canAccessWorkspace(userId, workspaceId, "read")) throw new Error("Workspace tidak ditemukan atau tidak dapat diakses.");
  if (!workspaceIds.length) return [];
  const db = await getDb();
  if (!db) return [];
  return db.select().from(policyVersions).where(inArray(policyVersions.workspaceId, workspaceIds)).orderBy(desc(policyVersions.createdAt));
}

export async function decidePolicyVersion(userId: number, userRole: UserRole, policyVersionId: number, decision: "approved" | "rejected", note: string) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [policy] = await db.select().from(policyVersions).where(eq(policyVersions.id, policyVersionId)).limit(1);
  if (!policy || policy.status !== "pending") throw new Error("Policy version tidak tersedia untuk direview.");
  const outcome = applyPolicyDecisionWorkflow(policy.status, policy.requestedByUserId, userId, await reviewerEligible(userId, userRole, policy.workspaceId, policy.requestedByUserId), decision);
  await db.update(policyVersions).set({ status: outcome.status, decidedByUserId: userId, decisionNote: note.trim() || null, decidedAt: new Date() }).where(eq(policyVersions.id, policy.id));
  if (outcome.activePolicyUpdated) {
    await db.update(policyVersions).set({ status: "superseded" }).where(and(eq(policyVersions.workspaceId, policy.workspaceId), eq(policyVersions.status, "approved")));
    await db.update(policyVersions).set({ status: "approved" }).where(eq(policyVersions.id, policy.id));
    await db.update(workspaces).set({ safeHarbor: policy.safeHarbor, codeOfConduct: policy.codeOfConduct, allowlist: policy.allowlist, exclusions: policy.exclusions }).where(eq(workspaces.id, policy.workspaceId));
  }
  await addAudit(policy.workspaceId, "policy", "policy-version-decided", { policyVersionId, version: policy.version, decision, decidedByUserId: userId });
  return { success: true };
}

export async function listIncidents(userId: number, workspaceId?: number) {
  const workspaceIds = workspaceId ? [workspaceId] : await getReadableWorkspaceIds(userId);
  if (workspaceId && !await canAccessWorkspace(userId, workspaceId, "read")) throw new Error("Workspace tidak ditemukan atau tidak dapat diakses.");
  if (!workspaceIds.length) return [];
  const db = await getDb();
  if (!db) return [];
  return db.select().from(incidents).where(inArray(incidents.workspaceId, workspaceIds)).orderBy(desc(incidents.createdAt));
}

export async function createIncident(userId: number, input: { workspaceId: number; title: string; description: string; severity: IncidentSeverity }) {
  if (!await canAccessWorkspace(userId, input.workspaceId, "respond")) throw new Error("Only the workspace owner or operator can create an incident.");
  const workspace = await workspaceOrThrow(input.workspaceId);
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const escalationDueAt = getEscalationDueAt(input.severity);
  await db.insert(incidents).values({ workspaceId: workspace.id, title: input.title.trim(), description: input.description.trim(), severity: input.severity, createdByUserId: userId, escalationDueAt });
  await addAudit(workspace.id, "incident", "incident-created", { severity: input.severity, createdByUserId: userId, escalationDueAt: escalationDueAt.toISOString() });
  await emitWorkspaceSignal({ userId: workspace.ownerUserId, workspaceId: workspace.id, eventType: "incident_created", severity: input.severity === "critical" || input.severity === "high" ? "critical" : "warning", title: `Incident ${input.severity}: ${input.title.trim()}`, message: `Incident tercatat pada workspace ${workspace.name}. Escalation due: ${escalationDueAt.toLocaleString()}.` });
  return { success: true };
}

export async function acknowledgeIncident(userId: number, incidentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [incident] = await db.select().from(incidents).where(eq(incidents.id, incidentId)).limit(1);
  if (!incident || !await canAccessWorkspace(userId, incident.workspaceId, "respond")) throw new Error("Incident tidak ditemukan atau tidak dapat diakui.");
  await db.update(incidents).set({ status: transitionIncidentWorkflow(incident.status, "acknowledge"), acknowledgedByUserId: userId, acknowledgedAt: new Date() }).where(eq(incidents.id, incident.id));
  await addAudit(incident.workspaceId, "incident", "incident-acknowledged", { incidentId, acknowledgedByUserId: userId });
  return { success: true };
}

export async function resolveIncident(userId: number, incidentId: number, resolutionNote: string) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [incident] = await db.select().from(incidents).where(eq(incidents.id, incidentId)).limit(1);
  if (!incident || !await canAccessWorkspace(userId, incident.workspaceId, "respond")) throw new Error("Incident tidak ditemukan atau tidak dapat diselesaikan.");
  await db.update(incidents).set({ status: transitionIncidentWorkflow(incident.status, "resolve"), resolutionNote: resolutionNote.trim() || null, resolvedAt: new Date() }).where(eq(incidents.id, incident.id));
  await addAudit(incident.workspaceId, "incident", "incident-resolved", { incidentId, resolvedByUserId: userId });
  return { success: true };
}

export async function listIncidentEvidence(userId: number, incidentId: number) {
  const db = await getDb();
  if (!db) return [];
  const [incident] = await db.select().from(incidents).where(eq(incidents.id, incidentId)).limit(1);
  if (!incident || !await canAccessWorkspace(userId, incident.workspaceId, "read")) throw new Error("Incident tidak ditemukan atau tidak dapat diakses.");
  return db.select({ id: incidentEvidenceLinks.id, evidenceArtifactId: evidenceArtifacts.id, storageReference: evidenceArtifacts.storageReference, sha256: evidenceArtifacts.sha256, artifactType: evidenceArtifacts.artifactType, createdAt: incidentEvidenceLinks.createdAt }).from(incidentEvidenceLinks).leftJoin(evidenceArtifacts, eq(incidentEvidenceLinks.evidenceArtifactId, evidenceArtifacts.id)).where(eq(incidentEvidenceLinks.incidentId, incident.id));
}

export async function linkIncidentEvidence(userId: number, incidentId: number, evidenceArtifactId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [incident] = await db.select().from(incidents).where(eq(incidents.id, incidentId)).limit(1);
  const [evidence] = await db.select().from(evidenceArtifacts).where(eq(evidenceArtifacts.id, evidenceArtifactId)).limit(1);
  const responseAccess = Boolean(incident && await canAccessWorkspace(userId, incident.workspaceId, "respond"));
  if (!incident || !evidence || !canLinkIncidentEvidence(responseAccess, evidence.workspaceId, incident.workspaceId)) throw new Error("Evidence must belong to this incident workspace and require incident response access.");
  await db.insert(incidentEvidenceLinks).values({ incidentId: incident.id, evidenceArtifactId: evidence.id, linkedByUserId: userId }).onDuplicateKeyUpdate({ set: { linkedByUserId: userId } });
  await addAudit(incident.workspaceId, "incident", "incident-evidence-linked", { incidentId: incident.id, evidenceArtifactId: evidence.id, linkedByUserId: userId });
  return { success: true };
}

export async function listWebhookActivationRequests(userId: number, workspaceId?: number) {
  const workspaceIds = workspaceId ? [workspaceId] : await getReadableWorkspaceIds(userId);
  if (workspaceId && !await canAccessWorkspace(userId, workspaceId, "read")) throw new Error("Workspace tidak ditemukan atau tidak dapat diakses.");
  if (!workspaceIds.length) return [];
  const db = await getDb();
  if (!db) return [];
  return db.select().from(webhookActivationRequests).where(inArray(webhookActivationRequests.workspaceId, workspaceIds)).orderBy(desc(webhookActivationRequests.createdAt));
}

export async function requestWebhookActivation(userId: number, workspaceId: number) {
  const workspace = await ownedWorkspaceOrThrow(userId, workspaceId);
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [configuration] = await db.select().from(webhookConfigurations).where(eq(webhookConfigurations.workspaceId, workspace.id)).limit(1);
  const [existing] = await db.select().from(webhookActivationRequests).where(and(eq(webhookActivationRequests.workspaceId, workspace.id), eq(webhookActivationRequests.status, "pending"))).limit(1);
  const pending = prepareWebhookActivationWorkflow(Boolean(configuration && isWebhookActivationReady(configuration)), Boolean(existing), userId);
  await db.insert(webhookActivationRequests).values({ workspaceId: workspace.id, webhookConfigurationId: configuration!.id, requestedByUserId: pending.requestedByUserId, status: pending.status });
  await addAudit(workspace.id, "webhook", "activation-requested", { webhookConfigurationId: configuration.id, requestedByUserId: userId, outboundDelivery: "still-disabled" });
  await emitWorkspaceSignal({ userId: workspace.ownerUserId, workspaceId: workspace.id, eventType: "webhook_activation_requested", severity: "warning", title: "Webhook activation menunggu review", message: `Workspace ${workspace.name} memiliki draft webhook yang siap direview. Outbound delivery tetap disabled.` });
  return { success: true, enabled: false as const };
}

export async function decideWebhookActivation(userId: number, userRole: UserRole, requestId: number, decision: "approved" | "rejected", note: string) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [request] = await db.select().from(webhookActivationRequests).where(eq(webhookActivationRequests.id, requestId)).limit(1);
  if (!request || request.status !== "pending") throw new Error("Activation request tidak tersedia untuk direview.");
  const outcome = applyWebhookReviewWorkflow(request.status, request.requestedByUserId, userId, await reviewerEligible(userId, userRole, request.workspaceId, request.requestedByUserId), decision);
  await db.update(webhookActivationRequests).set({ status: outcome.status, decidedByUserId: userId, decisionNote: note.trim() || null, decidedAt: new Date() }).where(eq(webhookActivationRequests.id, request.id));
  await db.update(webhookConfigurations).set({ enabled: 0 }).where(eq(webhookConfigurations.id, request.webhookConfigurationId));
  await addAudit(request.workspaceId, "webhook", "activation-decided", { requestId, decision, decidedByUserId: userId, outboundDelivery: "still-disabled" });
  return { success: true, enabled: false as const };
}

export async function escalateOverdueIncidentsForWorkspace(workspace: { id: number; ownerUserId: number; name: string }) {
  const db = await getDb();
  if (!db) return 0;
  const overdueCandidates = await db.select().from(incidents).where(and(eq(incidents.workspaceId, workspace.id), inArray(incidents.status, ["open", "acknowledged"]), lt(incidents.escalationDueAt, new Date()), isNull(incidents.escalatedAt)));
  const overdue = overdueCandidates.filter(incident => shouldEscalateIncident(incident.status, incident.escalationDueAt, incident.escalatedAt));
  for (const incident of overdue) {
    await db.update(incidents).set({ escalatedAt: new Date() }).where(eq(incidents.id, incident.id));
    await addAudit(workspace.id, "incident", "incident-escalated", { incidentId: incident.id, severity: incident.severity, networkCalls: 0 });
    await emitWorkspaceSignal({ userId: workspace.ownerUserId, workspaceId: workspace.id, eventType: "incident_created", severity: "critical", title: `Escalation overdue: ${incident.title}`, message: `Incident #${incident.id} on workspace ${workspace.name} is overdue for escalation. No target interaction occurred.` });
  }
  return overdue.length;
}
