import { createHash } from "crypto";
import { asc, desc, eq } from "drizzle-orm";
import { auditEvents } from "../../drizzle/schema";
import { getDb } from "../db";

/**
 * P5 — Audit log hash chain.
 *
 * `auditEvents.evidenceHash` sudah ada sebelumnya tapi dihitung berdiri sendiri
 * per baris (bukan chain sungguhan). Modul ini menambahkan `previousEntryHash`
 * + `chainHash` (lihat migration 0054) sehingga setiap entry terhubung secara
 * kriptografis ke entry sebelumnya dalam satu workspace, dan modifikasi entry
 * lama akan merusak chain-nya (terdeteksi oleh verifyAuditChain).
 *
 * Genesis: entry pertama di sebuah workspace punya previousEntryHash = null.
 */

const GENESIS = "genesis";
type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Transaction = Parameters<Database["transaction"]>[0] extends (tx: infer T, ...args: any[]) => any ? T : never;

export type AuditChainEntryInput = {
  workspaceId: number;
  category: string;
  subject: string;
  evidenceHash: string;
  traceId?: string | null;
  details: string;
};

function computeChainHash(input: {
  previousHash: string;
  workspaceId: number;
  category: string;
  subject: string;
  evidenceHash: string;
  details: string;
  createdAtIso: string;
}): string {
  const payload = JSON.stringify({
    previous_hash: input.previousHash,
    workspace_id: input.workspaceId,
    category: input.category,
    subject: input.subject,
    evidence_hash: input.evidenceHash,
    details: input.details,
    created_at: input.createdAtIso,
  });
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Insert satu audit entry dan sambungkan ke chain workspace tersebut.
 * Wajib dipanggil di dalam db.transaction() oleh caller supaya pembacaan
 * "entry terakhir" dan insert entry baru atomic (mencegah race condition
 * saat dua audit event untuk workspace yang sama ditulis bersamaan).
 */
export async function appendAuditChainEntry(
  trx: Transaction,
  entry: AuditChainEntryInput,
) {
  if (!trx || !entry || !Number.isInteger(entry.workspaceId) || entry.workspaceId < 1 || typeof entry.category !== "string" || !entry.category.trim() || typeof entry.subject !== "string" || !entry.subject.trim() || typeof entry.evidenceHash !== "string" || !/^[a-f0-9]{64}$/i.test(entry.evidenceHash) || typeof entry.details !== "string") throw new Error("Audit chain entry is invalid.");
  const [lastEntry] = await trx
    .select({ chainHash: auditEvents.chainHash })
    .from(auditEvents)
    .where(eq(auditEvents.workspaceId, entry.workspaceId))
    .orderBy(desc(auditEvents.id))
    .limit(1)
    .for("update");

  const previousHash = lastEntry?.chainHash ?? GENESIS;
  const createdAt = new Date();
  const chainHash = computeChainHash({
    previousHash,
    workspaceId: entry.workspaceId,
    category: entry.category,
    subject: entry.subject,
    evidenceHash: entry.evidenceHash,
    details: entry.details,
    createdAtIso: createdAt.toISOString(),
  });

  const [inserted] = await trx.insert(auditEvents).values({
    workspaceId: entry.workspaceId,
    category: entry.category,
    subject: entry.subject,
    evidenceHash: entry.evidenceHash,
    traceId: entry.traceId ?? null,
    details: entry.details,
    previousEntryHash: previousHash === GENESIS ? null : previousHash,
    chainHash,
    createdAt,
  });

  return { id: inserted.insertId, chainHash, previousEntryHash: previousHash === GENESIS ? null : previousHash };
}

export type AuditChainVerificationResult = {
  valid: boolean;
  workspaceId: number;
  checkedCount: number;
  brokenAtEntryId: number | null;
  reason: string | null;
};

/**
 * Verifikasi seluruh chain milik satu workspace secara berurutan.
 * Dipakai untuk audit periodik / endpoint admin, bukan di hot path.
 */
export async function verifyAuditChain(workspaceId: number): Promise<AuditChainVerificationResult> {
  if (!Number.isInteger(workspaceId) || workspaceId < 1) throw new Error("workspaceId must be a positive integer.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const entries = await db
    .select({
      id: auditEvents.id,
      category: auditEvents.category,
      subject: auditEvents.subject,
      evidenceHash: auditEvents.evidenceHash,
      details: auditEvents.details,
      previousEntryHash: auditEvents.previousEntryHash,
      chainHash: auditEvents.chainHash,
      createdAt: auditEvents.createdAt,
    })
    .from(auditEvents)
    .where(eq(auditEvents.workspaceId, workspaceId))
    .orderBy(asc(auditEvents.id));

  let expectedPrevious = GENESIS;
  let checkedCount = 0;
  for (const row of entries) {
    checkedCount += 1;
    if (!row.chainHash) {
      return { valid: false, workspaceId, checkedCount, brokenAtEntryId: row.id, reason: "missing_chain_hash" };
    }
    const actualPrevious = row.previousEntryHash ?? GENESIS;
    if (actualPrevious !== expectedPrevious) {
      return { valid: false, workspaceId, checkedCount: entries.length, brokenAtEntryId: row.id, reason: "previous_hash_mismatch" };
    }
    if (!(row.createdAt instanceof Date) || !Number.isFinite(row.createdAt.getTime()) || typeof row.category !== "string" || typeof row.subject !== "string" || typeof row.evidenceHash !== "string" || typeof row.details !== "string") return { valid: false, workspaceId, checkedCount, brokenAtEntryId: row.id, reason: "malformed_entry" };
    const recomputed = computeChainHash({
      previousHash: expectedPrevious,
      workspaceId,
      category: row.category,
      subject: row.subject,
      evidenceHash: row.evidenceHash,
      details: row.details,
      createdAtIso: row.createdAt.toISOString(),
    });
    if (recomputed !== row.chainHash) {
      return { valid: false, workspaceId, checkedCount: entries.length, brokenAtEntryId: row.id, reason: "chain_hash_mismatch" };
    }
    expectedPrevious = row.chainHash;
  }

  return { valid: true, workspaceId, checkedCount, brokenAtEntryId: null, reason: null };
}
