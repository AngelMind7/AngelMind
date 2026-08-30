import { and, desc, eq, inArray } from "drizzle-orm";
import { findings, passiveAssets, reportDrafts, reportVersions } from "../../drizzle/schema";
import { getDb } from "../db";
import { canAccessWorkspace } from "./operations";
import { composeReport, type ReportInput, type ReportPlatform } from "./report-composer";
import { parsePassiveInventory, type PassiveAsset } from "./passive-inventory";
import { upsertSearchDocument } from "../global-search";

export async function importPassiveAssets(userId: number, input: { workspaceId: number; content: string; format: "csv" | "json"; allowlist: string[]; exclusions: string[] }): Promise<PassiveAsset[]> {
  if (!(await canAccessWorkspace(userId, input.workspaceId, "respond"))) throw new Error("Workspace tidak dapat dikelola oleh user ini.");
  const parsed = parsePassiveInventory(input);
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  if (parsed.length > 0) await db.insert(passiveAssets).values(parsed.map(asset => ({ workspaceId: input.workspaceId, value: asset.value, hostname: asset.hostname, source: asset.source, inScope: asset.inScope ? 1 : 0, reason: asset.reason, importedByUserId: userId })));
  return parsed;
}

export async function listPassiveAssets(userId: number, workspaceId: number) {
  if (!(await canAccessWorkspace(userId, workspaceId, "read"))) throw new Error("Workspace tidak dapat diakses oleh user ini.");
  const db = await getDb();
  if (!db) return [];
  return db.select().from(passiveAssets).where(eq(passiveAssets.workspaceId, workspaceId)).orderBy(desc(passiveAssets.createdAt));
}

async function ensureFindingInWorkspace(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, findingId: number, workspaceId: number) {
  const [finding] = await db.select({ id: findings.id }).from(findings).where(and(eq(findings.id, findingId), eq(findings.workspaceId, workspaceId))).limit(1);
  if (!finding) throw new Error("Finding tidak ditemukan pada workspace ini.");
}

export async function saveReportDraft(userId: number, input: { findingId: number; workspaceId: number; platform: ReportPlatform; report: ReportInput }) {
  if (!(await canAccessWorkspace(userId, input.workspaceId, "respond"))) throw new Error("Workspace tidak dapat dikelola oleh user ini.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await ensureFindingInWorkspace(db, input.findingId, input.workspaceId);
  const reportJson = JSON.stringify(input.report);
  await db.insert(reportDrafts).values({ findingId: input.findingId, workspaceId: input.workspaceId, platform: input.platform, reportJson, lastSavedByUserId: userId }).onDuplicateKeyUpdate({ set: { platform: input.platform, reportJson, lastSavedByUserId: userId, updatedAt: new Date() } });
  const [draft] = await db.select().from(reportDrafts).where(and(eq(reportDrafts.findingId, input.findingId), eq(reportDrafts.workspaceId, input.workspaceId))).limit(1);
  return draft;
}

export async function getReportDraft(userId: number, findingId: number, workspaceId: number) {
  if (!(await canAccessWorkspace(userId, workspaceId, "read"))) throw new Error("Workspace tidak dapat diakses oleh user ini.");
  const db = await getDb();
  if (!db) return null;
  await ensureFindingInWorkspace(db, findingId, workspaceId);
  const [draft] = await db.select().from(reportDrafts).where(and(eq(reportDrafts.findingId, findingId), eq(reportDrafts.workspaceId, workspaceId))).limit(1);
  if (!draft) return null;
  return { ...draft, report: JSON.parse(draft.reportJson) as ReportInput };
}

export async function createReportVersion(userId: number, input: { findingId: number; workspaceId: number; platform: ReportPlatform; report: ReportInput }) {
  if (!(await canAccessWorkspace(userId, input.workspaceId, "respond"))) throw new Error("Workspace tidak dapat dikelola oleh user ini.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await ensureFindingInWorkspace(db, input.findingId, input.workspaceId);
  const composed = composeReport(input.report, input.platform);
  await db.insert(reportVersions).values({ findingId: input.findingId, workspaceId: input.workspaceId, platform: composed.platform, title: composed.title, body: composed.body, missingFields: JSON.stringify(composed.missingFields), readyForReview: composed.readyForReview ? 1 : 0, createdByUserId: userId });
  const [version] = await db.select().from(reportVersions).where(and(eq(reportVersions.findingId, input.findingId), eq(reportVersions.workspaceId, input.workspaceId))).orderBy(desc(reportVersions.id)).limit(1);
  if (version) await upsertSearchDocument({ workspaceId: input.workspaceId, entityType: "report", entityId: version.id, title: version.title, body: version.body });
  return composed;
}

export async function compareReportVersions(userId: number, input: { findingId: number; workspaceId: number; fromVersionId: number; toVersionId: number }) {
  if (!(await canAccessWorkspace(userId, input.workspaceId, "read"))) throw new Error("Workspace tidak dapat diakses oleh user ini.");
  if (input.fromVersionId === input.toVersionId) throw new Error("Report versions must be different.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await ensureFindingInWorkspace(db, input.findingId, input.workspaceId);
  const rows = await db.select().from(reportVersions).where(and(eq(reportVersions.findingId, input.findingId), eq(reportVersions.workspaceId, input.workspaceId), inArray(reportVersions.id, [input.fromVersionId, input.toVersionId])));
  const from = rows.find(row => row.id === input.fromVersionId);
  const to = rows.find(row => row.id === input.toVersionId);
  if (!from || !to) throw new Error("Kedua report version harus berasal dari finding/workspace yang sama.");
  const before = from.body.split("\\n");
  const after = to.body.split("\\n");
  const maxLines = Math.max(before.length, after.length);
  const changes = Array.from({ length: maxLines }, (_, index) => ({ line: index + 1, before: before[index] ?? null, after: after[index] ?? null })).filter(change => change.before !== change.after);
  return { findingId: input.findingId, fromVersionId: from.id, toVersionId: to.id, changedLines: changes.length, changes };
}

export async function listReportVersions(userId: number, findingId: number, workspaceId: number) {
  if (!(await canAccessWorkspace(userId, workspaceId, "read"))) throw new Error("Workspace tidak dapat diakses oleh user ini.");
  const db = await getDb();
  if (!db) return [];
  await ensureFindingInWorkspace(db, findingId, workspaceId);
  return db.select().from(reportVersions).where(and(eq(reportVersions.findingId, findingId), eq(reportVersions.workspaceId, workspaceId))).orderBy(desc(reportVersions.createdAt));
}
