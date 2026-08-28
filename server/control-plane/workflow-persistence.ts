import { and, desc, eq, inArray } from "drizzle-orm";
import { passiveAssets, reportVersions } from "../../drizzle/schema";
import { getDb } from "../db";
import { canAccessWorkspace } from "./operations";
import { composeReport, type ReportInput, type ReportPlatform } from "./report-composer";
import { parsePassiveInventory, type PassiveAsset } from "./passive-inventory";

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

export async function createReportVersion(userId: number, input: { findingId: number; workspaceId: number; platform: ReportPlatform; report: ReportInput }) {
  if (!(await canAccessWorkspace(userId, input.workspaceId, "respond"))) throw new Error("Workspace tidak dapat dikelola oleh user ini.");
  const composed = composeReport(input.report, input.platform);
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.insert(reportVersions).values({ findingId: input.findingId, workspaceId: input.workspaceId, platform: composed.platform, title: composed.title, body: composed.body, missingFields: JSON.stringify(composed.missingFields), readyForReview: composed.readyForReview ? 1 : 0, createdByUserId: userId });
  return composed;
}

export async function listReportVersions(userId: number, findingId: number, workspaceId: number) {
  if (!(await canAccessWorkspace(userId, workspaceId, "read"))) throw new Error("Workspace tidak dapat diakses oleh user ini.");
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reportVersions).where(and(eq(reportVersions.findingId, findingId), eq(reportVersions.workspaceId, workspaceId))).orderBy(desc(reportVersions.createdAt));
}
