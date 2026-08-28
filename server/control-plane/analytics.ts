import { and, desc, eq, gte } from "drizzle-orm";
import { auditEvents, findings, runs } from "../../drizzle/schema";
import { getDb } from "../db";
import { canAccessWorkspace } from "./operations";

export async function getWorkspaceAnalytics(userId: number, workspaceId: number, days = 30) {
  if (!(await canAccessWorkspace(userId, workspaceId, "read"))) throw new Error("Workspace tidak dapat diakses oleh user ini.");
  const db = await getDb();
  if (!db) return { days, points: [], totals: { auditEvents: 0, runs: 0, findings: 0 } };
  const since = new Date(Date.now() - Math.min(Math.max(days, 1), 90) * 86_400_000);
  const [events, workspaceRuns, workspaceFindings] = await Promise.all([
    db.select({ createdAt: auditEvents.createdAt }).from(auditEvents).where(and(eq(auditEvents.workspaceId, workspaceId), gte(auditEvents.createdAt, since))).orderBy(desc(auditEvents.createdAt)),
    db.select({ createdAt: runs.createdAt }).from(runs).where(and(eq(runs.workspaceId, workspaceId), gte(runs.createdAt, since))).orderBy(desc(runs.createdAt)),
    db.select({ createdAt: findings.createdAt }).from(findings).where(and(eq(findings.workspaceId, workspaceId), gte(findings.createdAt, since))).orderBy(desc(findings.createdAt)),
  ]);
  const points = Array.from({ length: Math.min(days, 90) }, (_, index) => { const date = new Date(Date.now() - (Math.min(days, 90) - 1 - index) * 86_400_000); const key = date.toISOString().slice(0, 10); return { date: key, auditEvents: events.filter(item => item.createdAt.toISOString().slice(0, 10) === key).length, runs: workspaceRuns.filter(item => item.createdAt.toISOString().slice(0, 10) === key).length, findings: workspaceFindings.filter(item => item.createdAt.toISOString().slice(0, 10) === key).length }; });
  return { days: Math.min(days, 90), points, totals: { auditEvents: events.length, runs: workspaceRuns.length, findings: workspaceFindings.length } };
}
