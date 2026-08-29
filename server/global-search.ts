import { and, desc, eq, like, or } from "drizzle-orm";
import { findings, programs, reportVersions, researchAssets, researchSessions } from "../drizzle/schema";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";

export async function searchWorkspace(userId: number, input: { workspaceId: number; query: string; limit?: number }) {
  const query = input.query.trim().slice(0, 120);
  if (query.length < 2) throw new Error("Search query must contain at least two characters.");
  if (!(await canAccessWorkspace(userId, input.workspaceId, "read"))) throw new Error("Workspace tidak dapat diakses.");
  const db = await getDb();
  if (!db) return { query, findings: [], assets: [], sessions: [], programs: [], reports: [] };
  const limit = Math.min(50, Math.max(1, input.limit ?? 20));
  const pattern = `%${query}%`;
  const [findingRows, assetRows, sessionRows, programRows, reportRows] = await Promise.all([
    db.select({ id: findings.id, title: findings.title, status: findings.status, fingerprint: findings.fingerprint, kind: findings.impactSummary }).from(findings).where(and(eq(findings.workspaceId, input.workspaceId), or(like(findings.title, pattern), like(findings.fingerprint, pattern), like(findings.impactSummary, pattern)))).orderBy(desc(findings.updatedAt)).limit(limit),
    db.select({ id: researchAssets.id, value: researchAssets.value, hostname: researchAssets.hostname, state: researchAssets.state, kind: researchAssets.assetType }).from(researchAssets).where(and(eq(researchAssets.workspaceId, input.workspaceId), or(like(researchAssets.value, pattern), like(researchAssets.hostname, pattern)))).orderBy(desc(researchAssets.createdAt)).limit(limit),
    db.select({ id: researchSessions.id, title: researchSessions.title, state: researchSessions.state, kind: researchSessions.scopeDigest }).from(researchSessions).where(and(eq(researchSessions.workspaceId, input.workspaceId), like(researchSessions.title, pattern))).orderBy(desc(researchSessions.updatedAt)).limit(limit),
    db.select({ id: programs.id, name: programs.name, status: programs.status, kind: programs.description }).from(programs).where(and(like(programs.name, pattern), eq(programs.status, "active"))).orderBy(desc(programs.updatedAt)).limit(limit),
    db.select({ id: reportVersions.id, title: reportVersions.title, platform: reportVersions.platform, kind: reportVersions.body }).from(reportVersions).where(and(eq(reportVersions.workspaceId, input.workspaceId), like(reportVersions.title, pattern))).orderBy(desc(reportVersions.createdAt)).limit(limit),
  ]);
  return { query, findings: findingRows, assets: assetRows, sessions: sessionRows, programs: programRows, reports: reportRows };
}
