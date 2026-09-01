import { and, desc, eq, gte, inArray, like, or } from "drizzle-orm";
import { evidenceArtifacts, findings, intelligenceFeedItems, knowledgeNodes, programs, reportVersions, researchAssets, researchHypotheses, researchObservations, researchSessions, researchTasks, searchDocuments, workspaces } from "../drizzle/schema";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";

function clean(value: string | null | undefined, max = 20_000) {
  return String(value ?? "").trim().slice(0, max);
}

export async function upsertSearchDocument(input: { workspaceId: number; entityType: string; entityId: number; title: string; body: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(searchDocuments).values({ workspaceId: input.workspaceId, entityType: input.entityType, entityId: input.entityId, title: clean(input.title, 512), body: clean(input.body) }).onDuplicateKeyUpdate({ set: { title: clean(input.title, 512), body: clean(input.body), updatedAt: new Date() } });
}

export async function rebuildWorkspaceSearchIndex(userId: number, workspaceId: number) {
  if (!(await canAccessWorkspace(userId, workspaceId, "respond"))) throw new Error("Workspace tidak dapat dikelola.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [workspaceRow, findingRows, assetRows, sessionRows, reportRows, knowledgeRows, observationRows, hypothesisRows, taskRows, evidenceRows, intelligenceRows] = await Promise.all([
    db.select({ programId: workspaces.programId }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1),
    db.select({ id: findings.id, title: findings.title, body: findings.impactSummary }).from(findings).where(eq(findings.workspaceId, workspaceId)),
    db.select({ id: researchAssets.id, title: researchAssets.hostname, body: researchAssets.value }).from(researchAssets).where(eq(researchAssets.workspaceId, workspaceId)),
    db.select({ id: researchSessions.id, title: researchSessions.title, body: researchSessions.scopeDigest }).from(researchSessions).where(eq(researchSessions.workspaceId, workspaceId)),
    db.select({ id: reportVersions.id, title: reportVersions.title, body: reportVersions.body }).from(reportVersions).where(eq(reportVersions.workspaceId, workspaceId)),
    db.select({ id: knowledgeNodes.id, title: knowledgeNodes.label, body: knowledgeNodes.properties }).from(knowledgeNodes).where(and(eq(knowledgeNodes.workspaceId, workspaceId), eq(knowledgeNodes.status, "active"))),
    db.select({ id: researchObservations.id, title: researchObservations.title, body: researchObservations.content }).from(researchObservations).where(eq(researchObservations.workspaceId, workspaceId)),
    db.select({ id: researchHypotheses.id, title: researchHypotheses.description, body: researchHypotheses.reason }).from(researchHypotheses).where(eq(researchHypotheses.workspaceId, workspaceId)),
    db.select({ id: researchTasks.id, title: researchTasks.title, body: researchTasks.outputs }).from(researchTasks).where(eq(researchTasks.workspaceId, workspaceId)),
    db.select({ id: evidenceArtifacts.id, title: evidenceArtifacts.artifactType, body: evidenceArtifacts.quarantineReason }).from(evidenceArtifacts).where(eq(evidenceArtifacts.workspaceId, workspaceId)),
    db.select({ id: intelligenceFeedItems.id, title: intelligenceFeedItems.source, body: intelligenceFeedItems.data }).from(intelligenceFeedItems).where(eq(intelligenceFeedItems.workspaceId, workspaceId)),
  ]);
  await db.delete(searchDocuments).where(eq(searchDocuments.workspaceId, workspaceId));
  const programId = workspaceRow[0]?.programId;
  const programRows = programId ? await db.select({ id: programs.id, title: programs.name, body: programs.description }).from(programs).where(eq(programs.id, programId)) : [];
  const rows = [
    ...programRows.map(row => ({ workspaceId, entityType: "program", entityId: row.id, title: clean(row.title, 512), body: clean(row.body) })),
    ...findingRows.map(row => ({ workspaceId, entityType: "finding", entityId: row.id, title: clean(row.title, 512), body: clean(row.body) })),
    ...assetRows.map(row => ({ workspaceId, entityType: "asset", entityId: row.id, title: clean(row.title, 512), body: clean(row.body) })),
    ...sessionRows.map(row => ({ workspaceId, entityType: "session", entityId: row.id, title: clean(row.title, 512), body: clean(row.body) })),
    ...reportRows.map(row => ({ workspaceId, entityType: "report", entityId: row.id, title: clean(row.title, 512), body: clean(row.body) })),
    ...knowledgeRows.map(row => ({ workspaceId, entityType: "knowledge_node", entityId: row.id, title: clean(row.title, 512), body: clean(row.body) })),
    ...observationRows.map(row => ({ workspaceId, entityType: "observation", entityId: row.id, title: clean(row.title, 512), body: clean(row.body) })),
    ...hypothesisRows.map(row => ({ workspaceId, entityType: "hypothesis", entityId: row.id, title: clean(row.title, 512), body: clean(row.body) })),
    ...taskRows.map(row => ({ workspaceId, entityType: "task", entityId: row.id, title: clean(row.title, 512), body: clean(row.body) })),
    ...evidenceRows.map(row => ({ workspaceId, entityType: "evidence", entityId: row.id, title: clean(row.title, 512), body: clean(row.body) })),
    ...intelligenceRows.map(row => ({ workspaceId, entityType: "intelligence", entityId: row.id, title: clean(row.title, 512), body: clean(row.body) })),
  ];
  if (rows.length > 0) await db.insert(searchDocuments).values(rows);
  return { workspaceId, indexed: rows.length };
}

export async function searchWorkspace(userId: number, input: { workspaceId: number; query: string; limit?: number; entityTypes?: string[]; freshnessDays?: number }) {
  const query = clean(input.query, 120);
  if (query.length < 2) throw new Error("Search query must contain at least two characters.");
  if (!(await canAccessWorkspace(userId, input.workspaceId, "read"))) throw new Error("Workspace tidak dapat diakses.");
  const db = await getDb();
  if (!db) return { query, results: [] };
  const limit = Math.min(100, Math.max(1, input.limit ?? 20));
  const entityTypes = Array.from(new Set((input.entityTypes ?? []).map(type => clean(type, 40)).filter(Boolean))).slice(0, 12);
  const freshnessDays = input.freshnessDays === undefined ? undefined : Math.min(3_650, Math.max(1, Math.trunc(input.freshnessDays)));
  const freshnessCutoff = freshnessDays === undefined ? undefined : new Date(Date.now() - freshnessDays * 86_400_000);
  const pattern = `%${query}%`;
  const tokens = Array.from(new Set(query.toLocaleLowerCase().split(/\s+/).map(token => token.replace(/[^A-Za-z0-9_-]/g, "")).filter(token => token.length >= 2))).slice(0, 12);
  const tokenPatterns = tokens.flatMap(token => [`%${token}%`]);
  const searchConditions = [like(searchDocuments.title, pattern), like(searchDocuments.body, pattern), ...tokenPatterns.flatMap(token => [like(searchDocuments.title, token), like(searchDocuments.body, token)])];
  const candidates = await db.select({ id: searchDocuments.entityId, entityType: searchDocuments.entityType, title: searchDocuments.title, body: searchDocuments.body, updatedAt: searchDocuments.updatedAt }).from(searchDocuments).where(and(eq(searchDocuments.workspaceId, input.workspaceId), entityTypes.length ? inArray(searchDocuments.entityType, entityTypes) : undefined, freshnessCutoff ? gte(searchDocuments.updatedAt, freshnessCutoff) : undefined, or(...searchConditions))).orderBy(desc(searchDocuments.updatedAt)).limit(Math.min(500, limit * 10));
  const normalizedQuery = query.toLocaleLowerCase();
  const score = (result: typeof candidates[number]) => {
    const title = result.title.toLocaleLowerCase();
    const body = result.body.toLocaleLowerCase();
    const exactTitle = title === normalizedQuery ? 100 : 0;
    const titlePrefix = title.startsWith(normalizedQuery) ? 40 : 0;
    const titleMatch = title.includes(normalizedQuery) ? 25 : 0;
    const bodyMatch = body.includes(normalizedQuery) ? 10 : 0;
    const tokenCoverage = tokens.length ? tokens.reduce((total, token) => total + (title.includes(token) ? 8 : body.includes(token) ? 3 : 0), 0) : 0;
    const freshness = Math.max(0, 10 - Math.floor((Date.now() - result.updatedAt.getTime()) / 86_400_000));
    return exactTitle + titlePrefix + titleMatch + bodyMatch + tokenCoverage + freshness;
  };
  const results = candidates.sort((left, right) => score(right) - score(left) || right.updatedAt.getTime() - left.updatedAt.getTime()).slice(0, limit);
  const byType = (entityType: string) => results.filter(result => result.entityType === entityType);
  return {
    query,
    results,
    findings: byType("finding"),
    assets: byType("asset"),
    sessions: byType("session"),
    reports: byType("report"),
    programs: byType("program"),
    knowledgeNodes: byType("knowledge_node"),
    observations: byType("observation"),
    hypotheses: byType("hypothesis"),
    tasks: byType("task"),
    evidence: byType("evidence"),
    intelligence: byType("intelligence"),
    facets: results.reduce<Record<string, number>>((facets, result) => { facets[result.entityType] = (facets[result.entityType] ?? 0) + 1; return facets; }, {}),
  };
}
