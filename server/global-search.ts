import { and, desc, eq, like, or } from "drizzle-orm";
import { findings, reportVersions, researchAssets, researchSessions, searchDocuments } from "../drizzle/schema";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";

function clean(value: string | null | undefined, max = 20_000) {
  return String(value ?? "").trim().slice(0, max);
}

export async function rebuildWorkspaceSearchIndex(userId: number, workspaceId: number) {
  if (!(await canAccessWorkspace(userId, workspaceId, "respond"))) throw new Error("Workspace tidak dapat dikelola.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [findingRows, assetRows, sessionRows, reportRows] = await Promise.all([
    db.select({ id: findings.id, title: findings.title, body: findings.impactSummary }).from(findings).where(eq(findings.workspaceId, workspaceId)),
    db.select({ id: researchAssets.id, title: researchAssets.hostname, body: researchAssets.value }).from(researchAssets).where(eq(researchAssets.workspaceId, workspaceId)),
    db.select({ id: researchSessions.id, title: researchSessions.title, body: researchSessions.scopeDigest }).from(researchSessions).where(eq(researchSessions.workspaceId, workspaceId)),
    db.select({ id: reportVersions.id, title: reportVersions.title, body: reportVersions.body }).from(reportVersions).where(eq(reportVersions.workspaceId, workspaceId)),
  ]);
  await db.delete(searchDocuments).where(eq(searchDocuments.workspaceId, workspaceId));
  const rows = [
    ...findingRows.map(row => ({ workspaceId, entityType: "finding", entityId: row.id, title: clean(row.title, 512), body: clean(row.body) })),
    ...assetRows.map(row => ({ workspaceId, entityType: "asset", entityId: row.id, title: clean(row.title, 512), body: clean(row.body) })),
    ...sessionRows.map(row => ({ workspaceId, entityType: "session", entityId: row.id, title: clean(row.title, 512), body: clean(row.body) })),
    ...reportRows.map(row => ({ workspaceId, entityType: "report", entityId: row.id, title: clean(row.title, 512), body: clean(row.body) })),
  ];
  if (rows.length > 0) await db.insert(searchDocuments).values(rows);
  return { workspaceId, indexed: rows.length };
}

export async function searchWorkspace(userId: number, input: { workspaceId: number; query: string; limit?: number }) {
  const query = clean(input.query, 120);
  if (query.length < 2) throw new Error("Search query must contain at least two characters.");
  if (!(await canAccessWorkspace(userId, input.workspaceId, "read"))) throw new Error("Workspace tidak dapat diakses.");
  const db = await getDb();
  if (!db) return { query, results: [] };
  const limit = Math.min(100, Math.max(1, input.limit ?? 20));
  const pattern = `%${query}%`;
  const results = await db.select({ id: searchDocuments.entityId, entityType: searchDocuments.entityType, title: searchDocuments.title, body: searchDocuments.body, updatedAt: searchDocuments.updatedAt }).from(searchDocuments).where(and(eq(searchDocuments.workspaceId, input.workspaceId), or(like(searchDocuments.title, pattern), like(searchDocuments.body, pattern)))).orderBy(desc(searchDocuments.updatedAt)).limit(limit);
  const byType = (entityType: string) => results.filter(result => result.entityType === entityType);
  return {
    query,
    results,
    findings: byType("finding"),
    assets: byType("asset"),
    sessions: byType("session"),
    reports: byType("report"),
    programs: [],
  };
}
