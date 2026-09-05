import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, inArray, isNull, lt, ne, or } from "drizzle-orm";
import { auditEvents, evidenceArtifacts, researchAssetVerifications, researchAssets } from "../drizzle/schema";
import { getDb } from "./db";
import { canAccessWorkspace, hasReviewerMembership } from "./control-plane/operations";
import { currentTraceContext } from "./_core/trace-context";

const VERIFICATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const METHODS = ["dns_txt", "file_upload", "cloud_role", "authorization_letter"] as const;
const STATUSES = ["requested", "pending_review", "verified", "rejected", "expired", "cancelled"] as const;
export type AssetVerificationMethod = (typeof METHODS)[number];
export type AssetVerificationDecision = "verified" | "rejected";

type VerificationInstructions = {
  method: AssetVerificationMethod;
  hostname: string;
  recordName?: string;
  filename?: string;
  token: string;
  summary: string;
};

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeHostname(value: string) {
  const trimmed = value.trim().toLowerCase().replace(/\.$/, "");
  if (!trimmed || trimmed.length > 255 || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(trimmed)) throw new Error("Asset hostname must be a valid DNS hostname.");
  return trimmed;
}

export function buildVerificationInstructions(method: AssetVerificationMethod, hostnameInput: string, token: string): VerificationInstructions {
  if (!METHODS.includes(method) || !/^[a-f0-9]{32}$/.test(token)) throw new Error("Verification method or token is invalid.");
  const hostname = normalizeHostname(hostnameInput);
  if (method === "dns_txt") return { method, hostname, recordName: `_angelmind-verify.${hostname}`, token, summary: "Tambahkan TXT record pada nama record yang diberikan. Sistem tidak melakukan DNS query otomatis; reviewer akan memeriksa bukti yang dikirim." };
  if (method === "file_upload") return { method, hostname, filename: "angelmind-verification.txt", token, summary: "Buat file dengan nama yang diberikan dan isi token. Upload bukti melalui storage yang disetujui lalu kirim referensinya." };
  if (method === "cloud_role") return { method, hostname, token, summary: "Tambahkan token ke trust-policy atau role metadata yang disetujui dan kirim ARN serta evidence artifact untuk review manual." };
  return { method, hostname, token, summary: "Cantumkan token pada surat otorisasi PDF yang ditandatangani, lalu kirim evidence artifact untuk review manual." };
}

export function assertVerificationDecision(input: { decision: AssetVerificationDecision; proofReference?: string | null; evidenceArtifactId?: number | null; reviewNote?: string | null }) {
  const proofReference = input.proofReference?.trim() || null;
  const reviewNote = input.reviewNote?.trim() || null;
  if (input.decision === "verified" && !proofReference && !input.evidenceArtifactId) throw new Error("Verification approval requires a proof reference or evidence artifact.");
  if (input.decision === "rejected" && !reviewNote) throw new Error("Rejected verification requires a review note.");
  if (proofReference && proofReference.length > 512) throw new Error("Verification proof reference is too long.");
  if (reviewNote && reviewNote.length > 20_000) throw new Error("Verification review note is too long.");
  return { proofReference, reviewNote };
}

async function loadAsset(userId: number, assetId: number, intent: "read" | "respond" = "read") {
  if (!Number.isInteger(assetId) || assetId < 1) throw new Error("Asset identity is invalid.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [asset] = await db.select().from(researchAssets).where(eq(researchAssets.id, assetId)).limit(1);
  if (!asset || !(await canAccessWorkspace(userId, asset.workspaceId, intent))) throw new Error("Asset tidak ditemukan atau tidak dapat diakses.");
  return { db, asset };
}

async function audit(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, workspaceId: number, userId: number, subject: string, details: Record<string, unknown>) {
  const traceId = currentTraceContext()?.traceId ?? null;
  await db.insert(auditEvents).values({ workspaceId, category: "asset-verification", subject, traceId, details: JSON.stringify({ actorUserId: userId, ...details }), evidenceHash: digest(JSON.stringify({ workspaceId, subject, details, traceId })) });
}

export async function listAssetVerifications(userId: number, assetId: number) {
  const { db, asset } = await loadAsset(userId, assetId);
  return db.select({ id: researchAssetVerifications.id, assetId: researchAssetVerifications.assetId, method: researchAssetVerifications.method, status: researchAssetVerifications.status, challengeReference: researchAssetVerifications.challengeReference, proofReference: researchAssetVerifications.proofReference, evidenceArtifactId: researchAssetVerifications.evidenceArtifactId, submittedByUserId: researchAssetVerifications.submittedByUserId, reviewedByUserId: researchAssetVerifications.reviewedByUserId, reviewNote: researchAssetVerifications.reviewNote, expiresAt: researchAssetVerifications.expiresAt, verifiedAt: researchAssetVerifications.verifiedAt, createdAt: researchAssetVerifications.createdAt, updatedAt: researchAssetVerifications.updatedAt }).from(researchAssetVerifications).where(and(eq(researchAssetVerifications.workspaceId, asset.workspaceId), eq(researchAssetVerifications.assetId, asset.id))).orderBy(asc(researchAssetVerifications.createdAt));
}

export async function requestAssetVerification(userId: number, input: { assetId: number; method: AssetVerificationMethod }) {
  if (!METHODS.includes(input.method)) throw new Error("Verification method is invalid.");
  const { db, asset } = await loadAsset(userId, input.assetId, "respond");
  if (!asset.inScope || asset.state === "out_of_scope" || asset.state === "archived") throw new Error("Only an in-scope active asset can be verified.");
  if (asset.verificationStatus === "verified") throw new Error("Asset is already verified.");
  const [active] = await db.select().from(researchAssetVerifications).where(and(eq(researchAssetVerifications.assetId, asset.id), eq(researchAssetVerifications.workspaceId, asset.workspaceId), inArray(researchAssetVerifications.status, ["requested", "pending_review"]))).orderBy(asc(researchAssetVerifications.createdAt)).limit(1);
  if (active) throw new Error("An active verification request already exists for this asset.");
  const hostname = asset.hostname ?? asset.value;
  const token = randomBytes(16).toString("hex");
  const instructions = buildVerificationInstructions(input.method, hostname, token);
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
  await db.insert(researchAssetVerifications).values({ workspaceId: asset.workspaceId, assetId: asset.id, method: input.method, status: "requested", tokenHash: digest(token), challengeReference: JSON.stringify({ method: input.method, hostname: instructions.hostname, recordName: instructions.recordName ?? null, filename: instructions.filename ?? null }), expiresAt });
  const [verification] = await db.select().from(researchAssetVerifications).where(and(eq(researchAssetVerifications.assetId, asset.id), eq(researchAssetVerifications.tokenHash, digest(token)))).orderBy(asc(researchAssetVerifications.createdAt)).limit(1);
  if (!verification) throw new Error("Verification request could not be created.");
  await db.update(researchAssets).set({ verificationStatus: "requested", verifiedAt: null }).where(eq(researchAssets.id, asset.id));
  await audit(db, asset.workspaceId, userId, "asset-verification-requested", { assetId: asset.id, verificationId: verification.id, method: input.method, expiresAt: expiresAt.toISOString() });
  return { verificationId: verification.id, assetId: asset.id, method: input.method, expiresAt, instructions };
}

export async function submitAssetVerification(userId: number, input: { verificationId: number; proofReference: string; evidenceArtifactId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [verification] = await db.select().from(researchAssetVerifications).where(eq(researchAssetVerifications.id, input.verificationId)).limit(1);
  if (!verification || !(await canAccessWorkspace(userId, verification.workspaceId, "respond"))) throw new Error("Verification request tidak ditemukan atau tidak dapat diakses.");
  if (!["requested", "pending_review"].includes(verification.status)) throw new Error("Verification request is no longer accepting proof.");
  if (verification.expiresAt <= new Date()) throw new Error("Verification request has expired.");
  const proofReference = input.proofReference.trim();
  if (proofReference.length < 3 || proofReference.length > 512) throw new Error("Verification proof reference is invalid.");
  if (input.evidenceArtifactId) {
    const [artifact] = await db.select({ id: evidenceArtifacts.id, status: evidenceArtifacts.status, workspaceId: evidenceArtifacts.workspaceId }).from(evidenceArtifacts).where(eq(evidenceArtifacts.id, input.evidenceArtifactId)).limit(1);
    if (!artifact || artifact.workspaceId !== verification.workspaceId) throw new Error("Verification evidence must belong to the same workspace.");
    if (!["scanned", "promoted"].includes(artifact.status)) throw new Error("Verification evidence must pass the security scan first.");
  }
  await db.update(researchAssetVerifications).set({ status: "pending_review", proofReference, evidenceArtifactId: input.evidenceArtifactId ?? null, submittedByUserId: userId, updatedAt: new Date() }).where(and(eq(researchAssetVerifications.id, verification.id), inArray(researchAssetVerifications.status, ["requested", "pending_review"])));
  await db.update(researchAssets).set({ verificationStatus: "pending_review" }).where(eq(researchAssets.id, verification.assetId));
  await audit(db, verification.workspaceId, userId, "asset-verification-proof-submitted", { assetId: verification.assetId, verificationId: verification.id, evidenceArtifactId: input.evidenceArtifactId ?? null });
  return { success: true as const, verificationId: verification.id, status: "pending_review" as const };
}

export async function reviewAssetVerification(userId: number, input: { verificationId: number; decision: AssetVerificationDecision; proofReference?: string; evidenceArtifactId?: number; reviewNote?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [verification] = await db.select().from(researchAssetVerifications).where(eq(researchAssetVerifications.id, input.verificationId)).limit(1);
  if (!verification || !(await hasReviewerMembership(userId, verification.workspaceId))) throw new Error("Reviewer workspace diperlukan untuk memutuskan verification.");
  if (verification.status !== "pending_review") throw new Error("Only pending verification requests can be reviewed.");
  const decision = assertVerificationDecision({ decision: input.decision, proofReference: input.proofReference ?? verification.proofReference, evidenceArtifactId: input.evidenceArtifactId ?? verification.evidenceArtifactId, reviewNote: input.reviewNote });
  const evidenceArtifactId = input.evidenceArtifactId ?? verification.evidenceArtifactId;
  if (evidenceArtifactId) {
    const [artifact] = await db.select({ id: evidenceArtifacts.id, status: evidenceArtifacts.status, workspaceId: evidenceArtifacts.workspaceId }).from(evidenceArtifacts).where(eq(evidenceArtifacts.id, evidenceArtifactId)).limit(1);
    if (!artifact || artifact.workspaceId !== verification.workspaceId || !["scanned", "promoted"].includes(artifact.status)) throw new Error("Review evidence must be a scanned or promoted artifact in the same workspace.");
  }
  const verifiedAt = input.decision === "verified" ? new Date() : null;
  await db.update(researchAssetVerifications).set({ status: input.decision, proofReference: decision.proofReference, evidenceArtifactId, reviewedByUserId: userId, reviewNote: decision.reviewNote, verifiedAt, updatedAt: new Date() }).where(and(eq(researchAssetVerifications.id, verification.id), eq(researchAssetVerifications.status, "pending_review")));
  await db.update(researchAssets).set({ verificationStatus: input.decision, verifiedAt }).where(eq(researchAssets.id, verification.assetId));
  await audit(db, verification.workspaceId, userId, "asset-verification-reviewed", { assetId: verification.assetId, verificationId: verification.id, decision: input.decision, evidenceArtifactId: evidenceArtifactId ?? null });
  return { success: true as const, verificationId: verification.id, decision: input.decision };
}

export async function expireAssetVerifications(limit = 100) {
  const db = await getDb();
  if (!db) return { inspected: 0, expired: 0 };
  const boundedLimit = Math.min(500, Math.max(1, limit));
  const rows = await db.select({ id: researchAssetVerifications.id, assetId: researchAssetVerifications.assetId, workspaceId: researchAssetVerifications.workspaceId }).from(researchAssetVerifications).where(and(inArray(researchAssetVerifications.status, ["requested", "pending_review"]), lt(researchAssetVerifications.expiresAt, new Date()))).orderBy(asc(researchAssetVerifications.expiresAt)).limit(boundedLimit);
  if (!rows.length) return { inspected: 0, expired: 0 };
  const ids = rows.map(row => row.id);
  await db.update(researchAssetVerifications).set({ status: "expired", updatedAt: new Date() }).where(and(inArray(researchAssetVerifications.id, ids), inArray(researchAssetVerifications.status, ["requested", "pending_review"])));
  for (const row of rows) {
    await db.update(researchAssets).set({ verificationStatus: "expired", verifiedAt: null }).where(and(eq(researchAssets.id, row.assetId), ne(researchAssets.verificationStatus, "verified")));
  }
  return { inspected: rows.length, expired: rows.length };
}

