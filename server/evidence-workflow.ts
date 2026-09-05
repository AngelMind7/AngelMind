import { createHash } from "node:crypto";
import { and, desc, eq, like, ne, or } from "drizzle-orm";
import { auditEvents, evidenceArtifacts, evidenceProvenance, findingRelations, findingRetests, findings, researchEvidenceLinks, researchHypotheses, researchObservations, reportVersions, workspaces } from "../drizzle/schema";
import { upsertSearchDocument } from "./global-search";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";
import { assertExpectedRevision, nextRevision } from "./_core/query-safety";
import { assertRetestOutcome } from "./retest-validation";

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function recordEvidenceWorkflowAudit(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  workspaceId: number,
  details: Record<string, unknown>,
) {
  const evidenceHash = digest({ workspaceId, category: "finding", subject: "finding-retest", details });
  await db.insert(auditEvents).values({
    workspaceId,
    category: "finding",
    subject: "finding-retest",
    evidenceHash,
    details: JSON.stringify(details),
  });
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

export async function linkEvidenceToResearchNode(userId: number, input: { evidenceArtifactId: number; observationId?: number; hypothesisId?: number; linkType: string }) {
  const { db, artifact } = await loadArtifact(userId, input.evidenceArtifactId, "respond");
  if ((input.observationId ? 1 : 0) + (input.hypothesisId ? 1 : 0) !== 1) throw new Error("Exactly one research target is required.");
  if (input.linkType.trim().length < 2) throw new Error("Evidence link type is required.");
  if (input.observationId) {
    const [observation] = await db.select({ id: researchObservations.id, sessionId: researchObservations.sessionId }).from(researchObservations).where(and(eq(researchObservations.id, input.observationId), eq(researchObservations.workspaceId, artifact.workspaceId))).limit(1);
    if (!observation) throw new Error("Observation tidak ditemukan pada workspace evidence.");
    if (input.hypothesisId) throw new Error("Evidence hanya boleh ditautkan ke satu research node.");
  }
  if (input.hypothesisId) {
    const [hypothesis] = await db.select({ id: researchHypotheses.id, sessionId: researchHypotheses.sessionId }).from(researchHypotheses).where(and(eq(researchHypotheses.id, input.hypothesisId), eq(researchHypotheses.workspaceId, artifact.workspaceId))).limit(1);
    if (!hypothesis) throw new Error("Hypothesis tidak ditemukan pada workspace evidence.");
  }
  await db.insert(researchEvidenceLinks).values({ workspaceId: artifact.workspaceId, evidenceArtifactId: artifact.id, observationId: input.observationId ?? null, hypothesisId: input.hypothesisId ?? null, linkType: input.linkType.trim(), createdByUserId: userId });
  await recordEvidenceWorkflowAudit(db, artifact.workspaceId, { evidenceArtifactId: artifact.id, observationId: input.observationId ?? null, hypothesisId: input.hypothesisId ?? null, linkType: input.linkType.trim(), linkedByUserId: userId, lineage: "research-node" });
  return { success: true as const, evidenceArtifactId: artifact.id, observationId: input.observationId ?? null, hypothesisId: input.hypothesisId ?? null };
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
  await upsertSearchDocument({ workspaceId: artifact.workspaceId, entityType: "evidence", entityId: artifact.id, title: artifact.artifactType, body: [artifact.artifactType, `status:${artifact.status}`, artifact.sha256, `source:${sourceType}`, `reference:${sourceReference}`, `capturedAt:${input.capturedAt.toISOString()}`].join("\\n") });
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

export async function requestFindingRetest(userId: number, input: { findingId: number; expectedRevision: number }) {
  const { db, finding } = await loadFinding(userId, input.findingId, "respond");
  const [active] = await db.select().from(findingRetests).where(and(eq(findingRetests.findingId, finding.id), eq(findingRetests.workspaceId, finding.workspaceId), or(eq(findingRetests.status, "requested"), eq(findingRetests.status, "in_progress")))).orderBy(desc(findingRetests.createdAt)).limit(1);
  if (active) return active;
  assertExpectedRevision(input.expectedRevision, finding.revision);
  if (!["validated", "reported", "notified", "remediation", "reopened", "inconclusive"].includes(finding.status)) throw new Error("Retest hanya dapat diminta setelah finding tervalidasi atau memasuki remediation.");
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, finding.workspaceId)).limit(1);
  if (!workspace) throw new Error("Workspace tidak ditemukan.");
  const scopeDigest = digest({ allowlist: workspace.allowlist, exclusions: workspace.exclusions, safeHarbor: workspace.safeHarbor, codeOfConduct: workspace.codeOfConduct });
  await db.insert(findingRetests).values({ workspaceId: finding.workspaceId, findingId: finding.id, requestedByUserId: userId, status: "requested", scopeDigest });
  const updated = await db.update(findings).set({ status: "retest", revision: nextRevision(finding.revision), updatedAt: new Date() }).where(and(eq(findings.id, finding.id), eq(findings.revision, input.expectedRevision)));
  if (updated[0].affectedRows !== 1) throw new Error("Concurrent update detected; reload the finding and retry.");
  const [retest] = await db.select().from(findingRetests).where(and(eq(findingRetests.findingId, finding.id), eq(findingRetests.requestedByUserId, userId))).orderBy(desc(findingRetests.createdAt)).limit(1);
  await recordEvidenceWorkflowAudit(db, finding.workspaceId, {
    findingId: finding.id,
    retestId: retest?.id ?? null,
    previousFindingStatus: finding.status,
    findingStatus: "retest",
    retestStatus: "requested",
    scopeDigest,
    requestedByUserId: userId,
  });
  await upsertSearchDocument({ workspaceId: finding.workspaceId, entityType: "finding", entityId: finding.id, title: finding.title, body: [finding.impactSummary, finding.remediationNotes ?? "", "status:retest"].filter(Boolean).join("\\n") });
  return retest;
}

export async function completeFindingRetest(userId: number, input: { retestId: number; status: "in_progress" | "passed" | "failed" | "inconclusive" | "cancelled"; resultSummary: string; evidenceArtifactId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [retest] = await db.select().from(findingRetests).where(eq(findingRetests.id, input.retestId)).limit(1);
  if (!retest || !(await canAccessWorkspace(userId, retest.workspaceId, "review"))) throw new Error("Retest tidak ditemukan atau reviewer permission diperlukan.");
  if (!["requested", "in_progress"].includes(retest.status)) throw new Error("Retest ini sudah memiliki hasil terminal dan tidak dapat ditulis ulang.");
  if (input.evidenceArtifactId) {
    const [artifact] = await db.select().from(evidenceArtifacts).where(and(eq(evidenceArtifacts.id, input.evidenceArtifactId), eq(evidenceArtifacts.workspaceId, retest.workspaceId))).limit(1);
    if (!artifact) throw new Error("Retest evidence must belong to the same workspace.");
    if (!["scanned", "promoted"].includes(artifact.status)) throw new Error("Retest evidence must pass the security scan before it can be attached.");
  }
  const outcome = assertRetestOutcome({ status: input.status, resultSummary: input.resultSummary, evidenceArtifactId: input.evidenceArtifactId, existingEvidenceArtifactId: retest.evidenceArtifactId });
  const resultSummary = outcome.resultSummary;
  const evidenceArtifactId = outcome.evidenceArtifactId;
  const terminal = ["passed", "failed", "inconclusive", "cancelled"].includes(input.status);
  const now = new Date();
  const retestUpdate = await db.update(findingRetests).set({ status: input.status, resultSummary, evidenceArtifactId, reviewedByUserId: userId, startedAt: input.status === "in_progress" ? (retest.startedAt ?? now) : retest.startedAt, completedAt: terminal ? now : null }).where(and(eq(findingRetests.id, retest.id), or(eq(findingRetests.status, "requested"), eq(findingRetests.status, "in_progress"))));
  if (retestUpdate[0].affectedRows !== 1) throw new Error("Concurrent update detected; this retest was already updated by another reviewer.");
  const [finding] = await db.select().from(findings).where(eq(findings.id, retest.findingId)).limit(1);
  if (!finding) throw new Error("Finding retest parent tidak ditemukan.");
  const nextStatus = input.status === "passed" ? "resolved" : input.status === "failed" ? "remediation" : input.status === "inconclusive" ? "inconclusive" : input.status === "cancelled" ? "remediation" : "retest";
  const findingUpdate = await db.update(findings).set({ status: nextStatus, revision: nextRevision(finding.revision), resolvedAt: nextStatus === "resolved" ? now : null, humanReviewStatus: nextStatus === "resolved" ? "pending" : finding.humanReviewStatus, updatedAt: now }).where(and(eq(findings.id, finding.id), eq(findings.revision, finding.revision)));
  if (findingUpdate[0].affectedRows !== 1) throw new Error("Concurrent update detected; reload the finding before recording the retest result.");
  await recordEvidenceWorkflowAudit(db, finding.workspaceId, {
    findingId: finding.id,
    retestId: retest.id,
    previousFindingStatus: finding.status,
    findingStatus: nextStatus,
    retestStatus: input.status,
    evidenceArtifactId,
    reviewedByUserId: userId,
  });
  await upsertSearchDocument({ workspaceId: finding.workspaceId, entityType: "finding", entityId: finding.id, title: finding.title, body: [finding.impactSummary, finding.remediationNotes ?? "", `status:${nextStatus}`, `retest:${input.status}`, resultSummary].filter(Boolean).join("\\n") });
  return { success: true as const, retestId: retest.id, status: input.status, findingStatus: nextStatus };
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
