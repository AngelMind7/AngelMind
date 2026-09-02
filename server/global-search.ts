import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { evidenceArtifacts, findings, intelligenceFeedItems, knowledgeNodes, programs, reportVersions, researchAssets, researchHypotheses, researchObservations, researchSessions, researchTasks, searchDocuments, workspaceNotes, workspaces } from "../drizzle/schema";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";
type SearchCursor = { score: number; updatedAt: string; rowId: number };
const SEMANTIC_VECTOR_DIMENSIONS = 96;

function encodeSearchCursor(cursor: SearchCursor): string {
  if (!Number.isInteger(cursor.score) || cursor.score < 0 || !Number.isInteger(cursor.rowId) || cursor.rowId < 1 || Number.isNaN(new Date(cursor.updatedAt).getTime())) throw new Error("Search cursor is invalid.");
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeSearchCursor(value: string | undefined): SearchCursor | null {
  if (!value?.trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<SearchCursor>;
    if (!Number.isInteger(parsed.score) || (parsed.score ?? -1) < 0 || !Number.isInteger(parsed.rowId) || (parsed.rowId ?? 0) < 1 || typeof parsed.updatedAt !== "string" || Number.isNaN(new Date(parsed.updatedAt).getTime())) throw new Error("invalid");
    const score = parsed.score;
    const rowId = parsed.rowId;
    if (score === undefined || rowId === undefined || parsed.updatedAt === undefined) throw new Error("invalid");
    return { score, updatedAt: new Date(parsed.updatedAt).toISOString(), rowId };
  } catch {
    throw new Error("Invalid search pagination cursor.");
  }
}

function clean(value: string | null | undefined, max = 20_000) {
  return String(value ?? "").trim().slice(0, max);
}

function semanticTokens(value: string) {
  return Array.from(new Set(value.toLocaleLowerCase().replace(/[^A-Za-z0-9_\s-]/g, " ").split(/\s+/).filter(token => token.length >= 2))).slice(0, 32);
}

function hashFeature(feature: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < feature.length; index += 1) {
    hash ^= feature.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function createSemanticVector(value: string) {
  const features = semanticTokens(value);
  const normalized = value.toLocaleLowerCase();
  for (let index = 0; index < normalized.length - 2; index += 1) {
    const gram = normalized.slice(index, index + 3);
    if (/\w/.test(gram)) features.push(`~${gram}`);
  }
  const vector = Array<number>(SEMANTIC_VECTOR_DIMENSIONS).fill(0);
  for (const feature of features) {
    const hash = hashFeature(feature);
    const bucket = hash % SEMANTIC_VECTOR_DIMENSIONS;
    const sign = hash & 1 ? 1 : -1;
    vector[bucket] += sign;
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return norm ? vector.map(value => value / norm) : vector;
}

function parseSemanticVector(value: string | null | undefined, fallbackText: string) {
  if (value) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length === SEMANTIC_VECTOR_DIMENSIONS && parsed.every(item => typeof item === "number" && Number.isFinite(item))) return parsed as number[];
    } catch {
      // Rebuild lazily for rows written before semanticVector was introduced.
    }
  }
  return createSemanticVector(fallbackText);
}

export function semanticSimilarity(left: number[], right: number[]) {
  let dot = 0; let leftNorm = 0; let rightNorm = 0;
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }
  return leftNorm && rightNorm ? dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm)) : 0;
}

export async function upsertSearchDocument(input: { workspaceId: number; entityType: string; entityId: number; title: string; body: string }) {
  if (!input || !Number.isInteger(input.workspaceId) || input.workspaceId < 1 || !Number.isInteger(input.entityId) || input.entityId < 1 || typeof input.entityType !== "string" || !/^[a-z0-9_-]{1,64}$/i.test(input.entityType) || typeof input.title !== "string" || typeof input.body !== "string") throw new Error("Search document input is invalid.");
  const db = await getDb();
  if (!db) return;
  const title = clean(input.title, 512);
  const body = clean(input.body);
  const semanticVector = JSON.stringify(createSemanticVector(`${title} ${body}`));
  await db.insert(searchDocuments).values({ workspaceId: input.workspaceId, entityType: input.entityType, entityId: input.entityId, title, body, semanticVector }).onDuplicateKeyUpdate({ set: { title, body, semanticVector, updatedAt: new Date() } });
}

export async function deleteSearchDocument(input: { workspaceId: number; entityType: string; entityId: number }) {
  if (!input || !Number.isInteger(input.workspaceId) || input.workspaceId < 1 || !Number.isInteger(input.entityId) || input.entityId < 1 || typeof input.entityType !== "string" || !/^[a-z0-9_-]{1,64}$/i.test(input.entityType)) throw new Error("Search document identity is invalid.");
  const db = await getDb();
  if (!db) return;
  await db.delete(searchDocuments).where(and(eq(searchDocuments.workspaceId, input.workspaceId), eq(searchDocuments.entityType, input.entityType), eq(searchDocuments.entityId, input.entityId)));
}

export async function rebuildWorkspaceSearchIndex(userId: number, workspaceId: number) {
  if (!Number.isInteger(userId) || userId < 1 || !Number.isInteger(workspaceId) || workspaceId < 1) throw new Error("Search index identity is invalid.");
  if (!(await canAccessWorkspace(userId, workspaceId, "respond"))) throw new Error("Workspace tidak dapat dikelola.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [workspaceRow, findingRows, assetRows, sessionRows, reportRows, knowledgeRows, observationRows, hypothesisRows, taskRows, evidenceRows, intelligenceRows, noteRows] = await Promise.all([
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
    db.select({ id: workspaceNotes.id, title: workspaceNotes.title, body: workspaceNotes.body }).from(workspaceNotes).where(eq(workspaceNotes.workspaceId, workspaceId)),
  ]);
  await db.delete(searchDocuments).where(eq(searchDocuments.workspaceId, workspaceId));
  const programId = workspaceRow[0]?.programId;
  const programRows = programId ? await db.select({ id: programs.id, title: programs.name, body: programs.description }).from(programs).where(eq(programs.id, programId)) : [];
  const rows = [
    ...programRows.map(row => ({ workspaceId, entityType: "program", entityId: row.id, title: clean(row.title, 512), body: clean(row.body), semanticVector: JSON.stringify(createSemanticVector(`${clean(row.title, 512)} ${clean(row.body)}`)) })),
    ...findingRows.map(row => ({ workspaceId, entityType: "finding", entityId: row.id, title: clean(row.title, 512), body: clean(row.body), semanticVector: JSON.stringify(createSemanticVector(`${clean(row.title, 512)} ${clean(row.body)}`)) })),
    ...assetRows.map(row => ({ workspaceId, entityType: "asset", entityId: row.id, title: clean(row.title, 512), body: clean(row.body), semanticVector: JSON.stringify(createSemanticVector(`${clean(row.title, 512)} ${clean(row.body)}`)) })),
    ...sessionRows.map(row => ({ workspaceId, entityType: "session", entityId: row.id, title: clean(row.title, 512), body: clean(row.body), semanticVector: JSON.stringify(createSemanticVector(`${clean(row.title, 512)} ${clean(row.body)}`)) })),
    ...reportRows.map(row => ({ workspaceId, entityType: "report", entityId: row.id, title: clean(row.title, 512), body: clean(row.body), semanticVector: JSON.stringify(createSemanticVector(`${clean(row.title, 512)} ${clean(row.body)}`)) })),
    ...knowledgeRows.map(row => ({ workspaceId, entityType: "knowledge_node", entityId: row.id, title: clean(row.title, 512), body: clean(row.body), semanticVector: JSON.stringify(createSemanticVector(`${clean(row.title, 512)} ${clean(row.body)}`)) })),
    ...observationRows.map(row => ({ workspaceId, entityType: "observation", entityId: row.id, title: clean(row.title, 512), body: clean(row.body), semanticVector: JSON.stringify(createSemanticVector(`${clean(row.title, 512)} ${clean(row.body)}`)) })),
    ...hypothesisRows.map(row => ({ workspaceId, entityType: "hypothesis", entityId: row.id, title: clean(row.title, 512), body: clean(row.body), semanticVector: JSON.stringify(createSemanticVector(`${clean(row.title, 512)} ${clean(row.body)}`)) })),
    ...taskRows.map(row => ({ workspaceId, entityType: "task", entityId: row.id, title: clean(row.title, 512), body: clean(row.body), semanticVector: JSON.stringify(createSemanticVector(`${clean(row.title, 512)} ${clean(row.body)}`)) })),
    ...evidenceRows.map(row => ({ workspaceId, entityType: "evidence", entityId: row.id, title: clean(row.title, 512), body: clean(row.body), semanticVector: JSON.stringify(createSemanticVector(`${clean(row.title, 512)} ${clean(row.body)}`)) })),
    ...intelligenceRows.map(row => ({ workspaceId, entityType: "intelligence", entityId: row.id, title: clean(row.title, 512), body: clean(row.body), semanticVector: JSON.stringify(createSemanticVector(`${clean(row.title, 512)} ${clean(row.body)}`)) })),
    ...noteRows.map(row => ({ workspaceId, entityType: "note", entityId: row.id, title: clean(row.title, 512), body: clean(row.body), semanticVector: JSON.stringify(createSemanticVector(`${clean(row.title, 512)} ${clean(row.body)}`)) })),
  ];
  if (rows.length > 0) await db.insert(searchDocuments).values(rows);
  return { workspaceId, indexed: rows.length };
}

export async function searchWorkspace(userId: number, input: { workspaceId: number; query: string; limit?: number; cursor?: string; entityTypes?: string[]; freshnessDays?: number }) {
  if (!Number.isInteger(userId) || userId < 1 || !input || !Number.isInteger(input.workspaceId) || input.workspaceId < 1 || typeof input.query !== "string" || (input.entityTypes !== undefined && (!Array.isArray(input.entityTypes) || !input.entityTypes.every(value => typeof value === "string")))) throw new Error("Search input is invalid.");
  const query = clean(input.query, 120);
  if (query.length < 2) throw new Error("Search query must contain at least two characters.");
  if (!(await canAccessWorkspace(userId, input.workspaceId, "read"))) throw new Error("Workspace tidak dapat diakses.");
  const db = await getDb();
  if (!db) return { query, results: [], hasNextPage: false, nextCursor: null, findings: [], assets: [], sessions: [], reports: [], programs: [], knowledgeNodes: [], observations: [], hypotheses: [], tasks: [], evidence: [], intelligence: [], facets: {} };
  const limit = Math.min(100, Math.max(1, input.limit ?? 20));
  const entityTypes = Array.from(new Set((input.entityTypes ?? []).map(type => clean(type, 40)).filter(Boolean))).slice(0, 12);
  const freshnessDays = input.freshnessDays === undefined ? undefined : Math.min(3_650, Math.max(1, Math.trunc(input.freshnessDays)));
  const freshnessCutoff = freshnessDays === undefined ? undefined : new Date(Date.now() - freshnessDays * 86_400_000);
  const cursor = decodeSearchCursor(input.cursor);
  const tokens = semanticTokens(query);
  const candidates = await db.select({ rowId: searchDocuments.id, id: searchDocuments.entityId, entityType: searchDocuments.entityType, title: searchDocuments.title, body: searchDocuments.body, semanticVector: searchDocuments.semanticVector, updatedAt: searchDocuments.updatedAt }).from(searchDocuments).where(and(eq(searchDocuments.workspaceId, input.workspaceId), entityTypes.length ? inArray(searchDocuments.entityType, entityTypes) : undefined, freshnessCutoff ? gte(searchDocuments.updatedAt, freshnessCutoff) : undefined)).orderBy(desc(searchDocuments.updatedAt), desc(searchDocuments.id)).limit(2_000);
  const normalizedQuery = query.toLocaleLowerCase();
  const queryVector = createSemanticVector(query);
  const score = (result: typeof candidates[number]) => {
    const title = result.title.toLocaleLowerCase();
    const body = result.body.toLocaleLowerCase();
    const exactTitle = title === normalizedQuery ? 100 : 0;
    const titlePrefix = title.startsWith(normalizedQuery) ? 40 : 0;
    const titleMatch = title.includes(normalizedQuery) ? 25 : 0;
    const bodyMatch = body.includes(normalizedQuery) ? 10 : 0;
    const tokenCoverage = tokens.length ? tokens.reduce((total, token) => total + (title.includes(token) ? 8 : body.includes(token) ? 3 : 0), 0) : 0;
    const semantic = Math.round(semanticSimilarity(queryVector, parseSemanticVector(result.semanticVector, `${result.title} ${result.body}`)) * 50);
    const freshness = Math.max(0, 10 - Math.floor((Date.now() - result.updatedAt.getTime()) / 86_400_000));
    return exactTitle + titlePrefix + titleMatch + bodyMatch + tokenCoverage + semantic + freshness;
  };
  const ranked = candidates.sort((left, right) => score(right) - score(left) || right.updatedAt.getTime() - left.updatedAt.getTime() || right.rowId - left.rowId);
  const afterCursor = cursor ? ranked.filter(result => { const resultScore = score(result); const cursorDate = new Date(cursor.updatedAt).getTime(); return resultScore < cursor.score || (resultScore === cursor.score && (result.updatedAt.getTime() < cursorDate || (result.updatedAt.getTime() === cursorDate && result.rowId < cursor.rowId))); }) : ranked;
  const hasNextPage = afterCursor.length > limit;
  const page = afterCursor.slice(0, limit);
  const last = page.at(-1);
  const nextCursor = hasNextPage && last ? encodeSearchCursor({ score: score(last), updatedAt: last.updatedAt.toISOString(), rowId: last.rowId }) : null;
  const results = page.map(({ rowId: _rowId, ...result }) => result);
  const byType = (entityType: string) => results.filter(result => result.entityType === entityType);
  return {
    query,
    results,
    hasNextPage,
    nextCursor,
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
