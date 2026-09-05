import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { approvals, auditEvents, incidents, policyVersions } from "../drizzle/schema";
import { getDb } from "./db";
import { canAccessWorkspace, hasApprovalAuthorityMembership } from "./control-plane/operations";

export const governanceFrameworks = ["SOC2", "ISO27001", "PCI-DSS", "GDPR"] as const;
export const governanceRiskLevels = ["low", "medium", "high", "critical"] as const;
export const governanceIncidentStatuses = ["open", "acknowledged", "investigating", "escalated", "resolved", "closed"] as const;

async function access(userId: number, workspaceId: number, intent: "read" | "review" | "respond" | "manage") {
  if (!(await canAccessWorkspace(userId, workspaceId, intent))) throw new Error("Workspace tidak ditemukan atau tidak dapat diakses.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  return db;
}

function digest(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

export async function createPolicy(userId: number, input: { workspaceId: number; safeHarbor: string; codeOfConduct: string; allowlist: string[]; exclusions: string[]; changeSummary: string }) {
  const db = await access(userId, input.workspaceId, "manage");
  const [latest] = await db.select({ version: policyVersions.version }).from(policyVersions).where(eq(policyVersions.workspaceId, input.workspaceId)).orderBy(desc(policyVersions.version)).limit(1);
  const version = (latest?.version ?? 0) + 1;
  const payload = { safeHarbor: input.safeHarbor.trim(), codeOfConduct: input.codeOfConduct.trim(), allowlist: input.allowlist, exclusions: input.exclusions, changeSummary: input.changeSummary.trim() };
  if (!payload.safeHarbor || !payload.codeOfConduct || !payload.changeSummary) throw new Error("Policy content is required.");
  const [created] = await db.insert(policyVersions).values({ workspaceId: input.workspaceId, version, safeHarbor: payload.safeHarbor, codeOfConduct: payload.codeOfConduct, allowlist: JSON.stringify(payload.allowlist), exclusions: JSON.stringify(payload.exclusions), changeSummary: payload.changeSummary, diffJson: JSON.stringify({ type: "initial" }), contentHash: digest(payload), status: "pending", requestedByUserId: userId }).$returningId();
  return { id: created.id, workspaceId: input.workspaceId, version, status: "pending" as const };
}

export async function listPolicies(userId: number, workspaceId: number) {
  const db = await access(userId, workspaceId, "read");
  return db.select().from(policyVersions).where(eq(policyVersions.workspaceId, workspaceId)).orderBy(desc(policyVersions.version));
}

export async function listApprovals(userId: number, workspaceId: number) {
  const db = await access(userId, workspaceId, "read");
  return db.select().from(approvals).where(eq(approvals.workspaceId, workspaceId)).orderBy(desc(approvals.createdAt));
}

export async function decideApproval(userId: number, input: { id: number; decision: "approve" | "reject"; note?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [row] = await db.select().from(approvals).where(eq(approvals.id, input.id)).limit(1);
  if (!row || !(await hasApprovalAuthorityMembership(userId, row.workspaceId)) && !(await canAccessWorkspace(userId, row.workspaceId, "manage"))) throw new Error("Approval tidak ditemukan atau tidak dapat diputuskan.");
  if (row.status !== "pending") throw new Error("Approval is not pending.");
  const status = input.decision === "approve" ? "approved" : "rejected";
  await db.update(approvals).set({ status, decidedByUserId: userId, decisionNote: input.note?.trim() || null, decidedAt: new Date() }).where(eq(approvals.id, row.id));
  return { id: row.id, status };
}

export async function escalateApproval(userId: number, input: { id: number; note: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [row] = await db.select().from(approvals).where(eq(approvals.id, input.id)).limit(1);
  if (!row || !(await hasApprovalAuthorityMembership(userId, row.workspaceId)) && !(await canAccessWorkspace(userId, row.workspaceId, "manage"))) throw new Error("Approval tidak ditemukan atau tidak dapat dieskalasikan.");
  if (row.status !== "pending") throw new Error("Only pending approvals can be escalated.");
  if (row.expiresAt && row.expiresAt <= new Date()) throw new Error("Approval sudah kedaluwarsa dan tidak dapat dieskalasikan.");
  const note = input.note.trim();
  if (note.length < 10 || note.length > 2_000) throw new Error("Escalation note must contain 10-2000 characters.");
  const now = new Date();
  const expiresAt = new Date(Math.max(row.expiresAt?.getTime() ?? now.getTime(), now.getTime()) + 24 * 60 * 60 * 1_000);
  await db.update(approvals).set({ escalationCount: row.escalationCount + 1, escalatedByUserId: userId, escalatedAt: now, expiresAt, decisionNote: note }).where(and(eq(approvals.id, row.id), eq(approvals.status, "pending")));
  const details = { approvalId: row.id, escalatedByUserId: userId, escalationCount: row.escalationCount + 1, note, expiresAt: expiresAt.toISOString(), execution: "blocked-by-safety-boundary" };
  const [previous] = await db.select({ chainHash: auditEvents.chainHash }).from(auditEvents).where(eq(auditEvents.workspaceId, row.workspaceId)).orderBy(desc(auditEvents.id)).limit(1);
  const evidenceHash = digest(details);
  const chainHash = digest({ previousEntryHash: previous?.chainHash ?? null, workspaceId: row.workspaceId, category: "governance", subject: "approval-escalated", evidenceHash });
  await db.insert(auditEvents).values({ workspaceId: row.workspaceId, category: "governance", subject: "approval-escalated", evidenceHash, previousEntryHash: previous?.chainHash ?? null, chainHash, traceId: randomUUID(), details: JSON.stringify(details) });
  return { id: row.id, status: "pending" as const, escalationCount: row.escalationCount + 1, expiresAt };
}

export async function createApproval(userId: number, input: { workspaceId: number; actionName: string; tier: "tier1" | "tier2" | "tier3"; context?: Record<string, unknown>; expiresAt?: Date }) {
  const db = await access(userId, input.workspaceId, "respond");
  if (!input.actionName.trim()) throw new Error("Approval action name is required.");
  const [created] = await db.insert(approvals).values({ workspaceId: input.workspaceId, actionName: input.actionName.trim(), tier: input.tier, contextJson: JSON.stringify(input.context ?? {}), requestedByUserId: userId, expiresAt: input.expiresAt ?? null }).$returningId();
  return { id: created.id, status: "pending" as const };
}

export async function appendAuditEvent(userId: number, input: { workspaceId: number; category: string; subject: string; details: Record<string, unknown> }) {
  const db = await access(userId, input.workspaceId, "respond");
  const [previous] = await db.select({ chainHash: auditEvents.chainHash }).from(auditEvents).where(eq(auditEvents.workspaceId, input.workspaceId)).orderBy(desc(auditEvents.id)).limit(1);
  const evidenceHash = digest(input.details);
  const chainHash = digest({ previousEntryHash: previous?.chainHash ?? null, workspaceId: input.workspaceId, category: input.category, subject: input.subject, evidenceHash });
  await db.insert(auditEvents).values({ workspaceId: input.workspaceId, category: input.category, subject: input.subject, evidenceHash, previousEntryHash: previous?.chainHash ?? null, chainHash, traceId: randomUUID(), details: JSON.stringify(input.details) });
  return { chainHash, evidenceHash };
}

export async function verifyAuditIntegrity(userId: number, workspaceId: number) {
  const db = await access(userId, workspaceId, "read");
  const rows = await db.select().from(auditEvents).where(eq(auditEvents.workspaceId, workspaceId)).orderBy(auditEvents.id);
  let previous: string | null = null;
  for (const row of rows) {
    if (row.previousEntryHash !== previous) return { valid: false, checked: rows.length, brokenAt: row.id };
    const expected = digest({ previousEntryHash: previous, workspaceId, category: row.category, subject: row.subject, evidenceHash: row.evidenceHash });
    if (row.chainHash !== expected) return { valid: false, checked: rows.length, brokenAt: row.id };
    previous = row.chainHash;
  }
  return { valid: true, checked: rows.length, brokenAt: null };
}

export async function createIncident(userId: number, input: { workspaceId: number; title: string; description: string; severity: "low" | "medium" | "high" | "critical"; escalationDueAt: Date }) {
  const db = await access(userId, input.workspaceId, "respond");
  if (!input.title.trim() || !input.description.trim()) throw new Error("Incident title and description are required.");
  const [created] = await db.insert(incidents).values({ workspaceId: input.workspaceId, title: input.title.trim(), description: input.description.trim(), severity: input.severity, escalationDueAt: input.escalationDueAt, createdByUserId: userId }).$returningId();
  return { id: created.id, status: "open" as const };
}

export async function listIncidents(userId: number, workspaceId: number) {
  const db = await access(userId, workspaceId, "read");
  return db.select().from(incidents).where(eq(incidents.workspaceId, workspaceId)).orderBy(desc(incidents.createdAt));
}

export async function updateIncident(userId: number, input: { id: number; status: "acknowledged" | "investigating" | "escalated" | "resolved" | "closed"; resolutionNote?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [row] = await db.select().from(incidents).where(eq(incidents.id, input.id)).limit(1);
  if (!row || !(await canAccessWorkspace(userId, row.workspaceId, "respond"))) throw new Error("Incident tidak ditemukan atau tidak dapat diakses.");
  await db.update(incidents).set({ status: input.status, acknowledgedByUserId: input.status === "acknowledged" ? userId : row.acknowledgedByUserId, acknowledgedAt: input.status === "acknowledged" ? new Date() : row.acknowledgedAt, escalatedAt: input.status === "escalated" ? new Date() : row.escalatedAt, resolutionNote: input.resolutionNote?.trim() || row.resolutionNote, resolvedAt: ["resolved", "closed"].includes(input.status) ? new Date() : row.resolvedAt }).where(eq(incidents.id, row.id));
  return { id: row.id, status: input.status };
}

export function buildComplianceMap(framework: typeof governanceFrameworks[number]) {
  return { framework, controls: [], evidenceRequired: true, sourceOfTruth: "governance-audit", status: "ready" as const };
}

export function buildRiskAssessment(input: { title: string; likelihood: number; impact: number }) {
  const likelihood = Math.max(1, Math.min(5, Math.floor(input.likelihood)));
  const impact = Math.max(1, Math.min(5, Math.floor(input.impact)));
  const score = likelihood * impact;
  return { title: input.title.trim(), likelihood, impact, score, level: score >= 20 ? "critical" : score >= 12 ? "high" : score >= 6 ? "medium" : "low" };
}

export function buildVendorAssessment(input: { vendor: string; dataAccess: "none" | "limited" | "sensitive"; criticality: "low" | "medium" | "high" }) {
  return { vendor: input.vendor.trim(), dataAccess: input.dataAccess, criticality: input.criticality, requiresReview: input.dataAccess === "sensitive" || input.criticality === "high" };
}
