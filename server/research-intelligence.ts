import { and, desc, eq } from "drizzle-orm";
import { evolutionSnapshots, failureObservations, intelligenceFeedItems, playbooks, researchSessions, workspaces } from "../drizzle/schema";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";
import { compareAssetSnapshots, normalizeIntelligenceFeed, validateFailureObservation, type AssetSnapshot, type FailureObservation, type IntelligenceFeedItem } from "./control-plane/intelligence-engine";

async function requireWorkspace(userId: number, workspaceId: number, intent: "read" | "respond" | "manage" = "read") {
  if (!(await canAccessWorkspace(userId, workspaceId, intent))) throw new Error("Workspace tidak ditemukan atau tidak dapat diakses.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  if (!workspace) throw new Error("Workspace tidak ditemukan.");
  return { db, workspace };
}

async function requireSessionInWorkspace(userId: number, sessionId: number, workspaceId: number) {
  const { db } = await requireWorkspace(userId, workspaceId, "respond");
  const [session] = await db.select().from(researchSessions).where(and(eq(researchSessions.id, sessionId), eq(researchSessions.workspaceId, workspaceId))).limit(1);
  if (!session) throw new Error("Research session tidak ditemukan di workspace ini.");
  return { db, session };
}

async function audit(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, workspaceId: number, userId: number, subject: string, details: Record<string, unknown>) {
  const { auditEvents } = await import("../drizzle/schema");
  await db.insert(auditEvents).values({ workspaceId, category: "research-intelligence", subject, details: JSON.stringify({ actorUserId: userId, ...details }), evidenceHash: `${workspaceId}:${userId}:${subject}:${JSON.stringify(details)}`.slice(0, 128) });
}

export async function listFailureObservations(userId: number, workspaceId: number, sessionId?: number) {
  const { db } = await requireWorkspace(userId, workspaceId);
  return db.select().from(failureObservations).where(sessionId ? and(eq(failureObservations.workspaceId, workspaceId), eq(failureObservations.sessionId, sessionId)) : eq(failureObservations.workspaceId, workspaceId)).orderBy(desc(failureObservations.createdAt));
}

export async function createFailureObservation(userId: number, input: { workspaceId: number; sessionId: number } & FailureObservation) {
  const { db } = await requireSessionInWorkspace(userId, input.sessionId, input.workspaceId);
  const valid = validateFailureObservation(input);
  await db.insert(failureObservations).values({ workspaceId: input.workspaceId, sessionId: input.sessionId, kind: valid.kind, normalState: valid.normalState.trim(), condition: valid.condition.trim(), observedBehavior: valid.observedBehavior.trim(), impact: valid.impact, evidenceRefs: JSON.stringify(valid.evidenceRefs), status: "observed", createdByUserId: userId });
  const [created] = await db.select().from(failureObservations).where(and(eq(failureObservations.workspaceId, input.workspaceId), eq(failureObservations.sessionId, input.sessionId))).orderBy(desc(failureObservations.createdAt)).limit(1);
  if (!created) throw new Error("Failure observation could not be created.");
  await audit(db, input.workspaceId, userId, "failure-observation-created", { sessionId: input.sessionId, failureObservationId: created.id, kind: valid.kind });
  return created;
}

export async function listEvolutionSnapshots(userId: number, workspaceId: number, assetRef?: string) {
  const { db } = await requireWorkspace(userId, workspaceId);
  return db.select().from(evolutionSnapshots).where(assetRef ? and(eq(evolutionSnapshots.workspaceId, workspaceId), eq(evolutionSnapshots.assetRef, assetRef)) : eq(evolutionSnapshots.workspaceId, workspaceId)).orderBy(desc(evolutionSnapshots.capturedAt));
}

export async function createEvolutionSnapshot(userId: number, input: { workspaceId: number; sessionId?: number; assetRef: string; version: string; capturedAt: Date; source: string; attributes: AssetSnapshot["attributes"] }) {
  const { db } = input.sessionId ? await requireSessionInWorkspace(userId, input.sessionId, input.workspaceId) : await requireWorkspace(userId, input.workspaceId, "respond");
  if (!input.assetRef.trim() || !input.version.trim() || !input.source.trim()) throw new Error("Snapshot requires asset reference, version, and source.");
  await db.insert(evolutionSnapshots).values({ workspaceId: input.workspaceId, sessionId: input.sessionId ?? null, assetRef: input.assetRef.trim().toLowerCase(), version: input.version.trim(), capturedAt: input.capturedAt, source: input.source.trim(), attributes: JSON.stringify(input.attributes) });
  const [created] = await db.select().from(evolutionSnapshots).where(and(eq(evolutionSnapshots.workspaceId, input.workspaceId), eq(evolutionSnapshots.assetRef, input.assetRef.trim().toLowerCase()))).orderBy(desc(evolutionSnapshots.createdAt)).limit(1);
  if (!created) throw new Error("Evolution snapshot could not be created.");
  await audit(db, input.workspaceId, userId, "evolution-snapshot-created", { snapshotId: created.id, assetRef: created.assetRef, version: created.version });
  return created;
}

export async function compareLatestEvolution(userId: number, workspaceId: number, assetRef: string) {
  const snapshots = await listEvolutionSnapshots(userId, workspaceId, assetRef);
  if (snapshots.length < 2) return { assetRef, changes: [], compared: false as const };
  const [latest, previous] = snapshots;
  return { assetRef, changes: compareAssetSnapshots({ assetId: assetRef, version: previous.version, capturedAt: previous.capturedAt.toISOString(), attributes: JSON.parse(previous.attributes) }, { assetId: assetRef, version: latest.version, capturedAt: latest.capturedAt.toISOString(), attributes: JSON.parse(latest.attributes) }), compared: true as const, fromVersion: previous.version, toVersion: latest.version };
}

export async function listIntelligenceFeed(userId: number, workspaceId: number, assetRef?: string) {
  const { db } = await requireWorkspace(userId, workspaceId);
  return db.select().from(intelligenceFeedItems).where(assetRef ? and(eq(intelligenceFeedItems.workspaceId, workspaceId), eq(intelligenceFeedItems.assetRef, assetRef.trim().toLowerCase())) : eq(intelligenceFeedItems.workspaceId, workspaceId)).orderBy(desc(intelligenceFeedItems.observedAt));
}

export async function createIntelligenceFeedItem(userId: number, input: { workspaceId: number } & IntelligenceFeedItem) {
  const { db } = await requireWorkspace(userId, input.workspaceId, "respond");
  const valid = normalizeIntelligenceFeed(input);
  await db.insert(intelligenceFeedItems).values({ workspaceId: input.workspaceId, source: valid.source, assetRef: valid.assetRef, observedAt: new Date(valid.observedAt), confidence: valid.confidence, reference: valid.reference ?? null, data: JSON.stringify(valid.data) });
  const [created] = await db.select().from(intelligenceFeedItems).where(and(eq(intelligenceFeedItems.workspaceId, input.workspaceId), eq(intelligenceFeedItems.assetRef, valid.assetRef))).orderBy(desc(intelligenceFeedItems.createdAt)).limit(1);
  if (!created) throw new Error("Intelligence feed item could not be created.");
  await audit(db, input.workspaceId, userId, "intelligence-feed-created", { feedItemId: created.id, source: valid.source, assetRef: valid.assetRef });
  return created;
}

export async function listPlaybooks(userId: number, workspaceId: number) {
  const { db } = await requireWorkspace(userId, workspaceId);
  return db.select().from(playbooks).where(eq(playbooks.workspaceId, workspaceId)).orderBy(desc(playbooks.updatedAt));
}

export async function createPlaybook(userId: number, input: { workspaceId: number; slug: string; version: string; status?: "draft" | "active" | "deprecated"; domains: string[]; assetTypes: string[]; technologies?: string[]; taskTemplates: unknown[] }) {
  const { db } = await requireWorkspace(userId, input.workspaceId, "manage");
  if (!input.slug.trim() || !input.version.trim()) throw new Error("Playbook requires slug and version.");
  await db.insert(playbooks).values({ workspaceId: input.workspaceId, slug: input.slug.trim().toLowerCase(), version: input.version.trim(), status: input.status ?? "draft", domains: JSON.stringify(input.domains), assetTypes: JSON.stringify(input.assetTypes), technologies: JSON.stringify(input.technologies ?? []), taskTemplates: JSON.stringify(input.taskTemplates), createdByUserId: userId });
  const [created] = await db.select().from(playbooks).where(and(eq(playbooks.workspaceId, input.workspaceId), eq(playbooks.slug, input.slug.trim().toLowerCase()), eq(playbooks.version, input.version.trim()))).limit(1);
  if (!created) throw new Error("Playbook could not be created.");
  await audit(db, input.workspaceId, userId, "playbook-created", { playbookId: created.id, slug: created.slug, version: created.version });
  return created;
}
