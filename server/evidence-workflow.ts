import { createHash } from "node:crypto";
import { and, desc, eq, like, ne, or } from "drizzle-orm";
import { evidenceArtifacts, evidenceProvenance, findingRelations, findingRetests, findings, reportVersions, workspaces } from "../drizzle/schema";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function loadArtifact(userId: number, evidenceArtifactId: number, intent: "read" | "respond" = "read") {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [artifact] = await db.select().from(evidenceArtifacts).where(eq(evidenceArtifacts.id, evidenceArtifactId)).limit(1);
  if (!artifact || !(await canAccessWorkspace(userId, artifact.workspaceId, intent))) throw new Error("Evidence tidak ditemukan atau tidak dapat diakses.");
  return { db, artifact };
}

async function loadFinding(userId: number, findingId: number, intent: "read" | "respond" | "review" = "read") {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [finding] = await db.select().from(findings).where(eq(findings.id, findingId)).limit(1);
  if (!finding || !(await canAccessWorkspace(userId, finding.workspaceId, intent))) throw new Error("Finding tidak ditemukan atau tidak dapat diakses.");
  return { db, finding };
}

export async function listEvidenceWithProvenance(userId: number, workspaceId: number) {
  if (!(await canAccessWorkspace(userId, workspaceId, "read"))) throw new Error("Workspace tidak dapat diakses.");
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: evidenceArtifacts.id, findingId: evidenceArtifacts.findingId, artifactType: evidenceArtifacts.artifactType, storageReference: evidenceArtifacts.storageReference, sha256: evidenceArtifacts.sha256, createdAt: evidenceArtifacts.createdAt, provenanceId: evidenceProvenance.id, sourceType: evidenceProvenance.sourceType, sourceReference: evidenceProvenance.sourceReference, capturedAt: evidenceProvenance.capturedAt, capturedByUserId: evidenceProvenance.capturedByUserId, provenanceMetadata: evidenceProvenance.metadata }).from(evidenceArtifacts).leftJoin(evidenceProvenance, eq(evidenceProvenance.evidenceArtifactId, evidenceArtifacts.id)).where(eq(evidenceArtifacts.workspaceId, workspaceId)).orderBy(desc(evidenceArtifacts.createdAt));
}

export async function recordEvidenceProvenance(userId: number, input: { evidenceArtifactId: number; sourceType: string; sourceReference: string; capturedAt: Date; metadata?: Record<string, unknown> }) {
  const { db, artifact } = await loadArtifact(userId, input.evidenceArtifactId, "respond");
  const sourceType = input.sourceType.trim().slice(0, 64);
  const sourceReference = input.sourceReference.trim().slice(0, 512);
  if (!sourceType || !sourceReference) throw new Error("Evidence provenance source is required.");
  await db.insert(evidenceProvenance).values({ evidenceArtifactId: artifact.id, workspaceId: artifact.workspaceId, sourceType, sourceReference, capturedAt: input.capturedAt, capturedByUserId: userId, metadata: JSON.stringify(input.metadata ?? {}) }).onDuplicateKeyUpdate({ set: { sourceType, sourceReference, capturedAt: input.capturedAt, capturedByUserId: userId, metadata: JSON.stringify(input.metadata ?? {}) } });
  const [provenance] = await db.select().from(evidenceProvenance).where(eq(evidenceProvenance.evidenceArtifactId, artifact.id)).limit(1);
  return provenance;
}

export async function listFindingRelations(userId: number, findingId: number) {
  const { db, finding } = await loadFinding(userId, findingId);
  return db.select().from(findingRelations).where(and(eq(findingRelations.workspaceId, finding.workspaceId), eq(findingRelations.findingId, finding.id))).orderBy(desc(findingRelations.createdAt));
}

export async function findDuplicateCandidates(userId: number, input: { findingId: number; query: string }) {
  const { db, finding } = await loadFinding(userId, input.findingId);
  const query = input.query.trim().slice(0, 120);
  if (query.length < 3) throw new Error("Duplicate search query is required.");
  return db.select({ id: findings.id, title: findings.title, status: findings.status, confidence: findings.confidence, fingerprint: findings.fingerprint, updatedAt: findings.updatedAt }).from(findings).where(and(eq(findings.workspaceId, finding.workspaceId), ne(findings.id, finding.id), or(like(findings.title, `%${query}%`), like(findings.impactSummary, `%${query}%`), like(findings.fingerprint, `%${query}%`)))).orderBy(desc(findings.updatedAt)).limit(20);
}

export async function linkFindingRelation(userId: number, input: { findingId: number; relatedFindingId: number; relationType: "duplicate" | "related" | "supersedes" }) {
  const { db, finding } = await loadFinding(userId, input.findingId, "respond");
  if (input.relatedFindingId === finding.id) throw new Error("A finding cannot relate to itself.");
  const [related] = await db.select().from(findings).where(and(eq(findings.id, input.relatedFindingId), eq(findings.workspaceId, finding.workspaceId))).limit(1);
  if (!related) throw new Error("Related finding must belong to the same workspace.");
  await db.insert(findingRelations).values({ workspaceId: finding.workspaceId, findingId: finding.id, relatedFindingId: related.id, relationType: input.relationType, createdByUserId: userId }).onDuplicateKeyUpdate({ set: { createdByUserId: userId } });
  if (input.relationType === "duplicate") await db.update(findings).set({ status: "duplicate", updatedAt: new Date() }).where(eq(findings.id, finding.id));
  return { success: true as const, findingId: finding.id, relatedFindingId: related.id, relationType: input.relationType };
}

export async function listFindingRetests(userId: number, findingId: number) {
  const { db, finding } = await loadFinding(userId, findingId);
  return db.select().from(findingRetests).where(and(eq(findingRetests.findingId, finding.id), eq(findingRetests.workspaceId, finding.workspaceId))).orderBy(desc(findingRetests.createdAt));
}

export async function requestFindingRetest(userId: number, findingId: number) {
  const { db, finding } = await loadFinding(userId, findingId, "respond");
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, finding.workspaceId)).limit(1);
  if (!workspace) throw new Error("Workspace tidak ditemukan.");
  const scopeDigest = digest({ allowlist: workspace.allowlist, exclusions: workspace.exclusions, safeHarbor: workspace.safeHarbor, codeOfConduct: workspace.codeOfConduct });
  await db.insert(findingRetests).values({ workspaceId: finding.workspaceId, findingId: finding.id, requestedByUserId: userId, status: "requested", scopeDigest });
  const [retest] = await db.select().from(findingRetests).where(and(eq(findingRetests.findingId, finding.id), eq(findingRetests.requestedByUserId, userId))).orderBy(desc(findingRetests.createdAt)).limit(1);
  return retest;
}

export async function completeFindingRetest(userId: number, input: { retestId: number; status: "in_progress" | "passed" | "failed" | "inconclusive" | "cancelled"; resultSummary: string; evidenceArtifactId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [retest] = await db.select().from(findingRetests).where(eq(findingRetests.id, input.retestId)).limit(1);
  if (!retest || !(await canAccessWorkspace(userId, retest.workspaceId, "review"))) throw new Error("Retest tidak ditemukan atau reviewer permission diperlukan.");
  if (input.evidenceArtifactId) {
    const [artifact] = await db.select().from(evidenceArtifacts).where(and(eq(evidenceArtifacts.id, input.evidenceArtifactId), eq(evidenceArtifacts.workspaceId, retest.workspaceId))).limit(1);
    if (!artifact) throw new Error("Retest evidence must belong to the same workspace.");
  }
  const resultSummary = input.resultSummary.trim();
  if (resultSummary.length < 3) throw new Error("Retest result summary is required.");
  await db.update(findingRetests).set({ status: input.status, resultSummary, evidenceArtifactId: input.evidenceArtifactId ?? null, reviewedByUserId: userId, completedAt: input.status === "passed" || input.status === "failed" || input.status === "inconclusive" || input.status === "cancelled" ? new Date() : null }).where(eq(findingRetests.id, retest.id));
  return { success: true as const, retestId: retest.id, status: input.status };
}

export async function getFindingQualityGate(userId: number, findingId: number) {
  const { db, finding } = await loadFinding(userId, findingId);
  const reports = await db.select().from(reportVersions).where(eq(reportVersions.findingId, finding.id)).orderBy(desc(reportVersions.createdAt)).limit(1);
  const latestReport = reports[0] ?? null;
  return {
    findingId: finding.id,
    status: finding.status,
    humanReviewStatus: finding.humanReviewStatus,
    latestReportReady: latestReport?.readyForReview === 1,
    latestReportId: latestReport?.id ?? null,
    readyForHumanReview: finding.status === "validated" && finding.humanReviewStatus === "pending" && latestReport?.readyForReview === 1,
    canSubmitExternally: finding.humanReviewStatus === "approved" && latestReport?.readyForReview === 1,
    requiredNextStep: finding.humanReviewStatus !== "approved" ? "human-review" : latestReport?.readyForReview !== 1 ? "complete-report" : "ready-for-external-submission",
  };
}
