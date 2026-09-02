import { and, asc, desc, eq, lte } from "drizzle-orm";
import { aiMemories, workspaces, researchSessions } from "../drizzle/schema";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";
import { assertExpectedRevision, nextRevision } from "./_core/query-safety";
import { deleteSearchDocument, upsertSearchDocument } from "./global-search";

export type AiMemoryScope = "user" | "workspace" | "session" | "program";

const MAX_CONTENT_LENGTH = 100_000;
const MAX_RETENTION_DAYS = 3_650;

type MemoryInput = {
  scope: AiMemoryScope;
  workspaceId?: number;
  sessionId?: number;
  programId?: number;
  memoryKey: string;
  content: string;
  sourceReference?: string | null;
  retentionDays?: number;
  expectedRevision?: number;
};

function clean(value: string | null | undefined, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export function buildMemoryScopeKey(input: Pick<MemoryInput, "scope" | "workspaceId" | "sessionId" | "programId" | "memoryKey">, userId: number) {
  return [input.scope, userId, input.workspaceId ?? 0, input.sessionId ?? 0, input.programId ?? 0, clean(input.memoryKey, 160)].join(":");
}

export function validateMemoryReferences(input: Pick<MemoryInput, "scope" | "workspaceId" | "sessionId" | "programId">) {
  const references = [input.workspaceId, input.sessionId, input.programId].filter(value => value !== undefined);
  if (references.some(value => !Number.isInteger(value) || (value ?? 0) < 1)) throw new Error("Memory references must be positive integers.");
  if (input.scope === "user" && references.length) throw new Error("User memory cannot include workspace, session, or program references.");
  if (input.scope === "workspace" && (input.workspaceId === undefined || input.sessionId !== undefined || input.programId !== undefined)) throw new Error("Workspace memory requires only a workspace reference.");
  if (input.scope === "session" && (input.workspaceId === undefined || input.sessionId === undefined || input.programId !== undefined)) throw new Error("Session memory requires matching workspace and session references.");
  if (input.scope === "program" && (input.workspaceId === undefined || input.programId === undefined || input.sessionId !== undefined)) throw new Error("Program memory requires matching workspace and program references.");
}

async function resolveWriteScope(userId: number, input: MemoryInput) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  validateMemoryReferences(input);
  if (input.scope === "user") return { db, workspaceId: null, sessionId: null, programId: null };
  const workspaceId = input.workspaceId!;
  if (!(await canAccessWorkspace(userId, workspaceId, "respond"))) throw new Error("Workspace tidak ditemukan atau tidak dapat diakses.");
  const [workspace] = await db.select({ id: workspaces.id, programId: workspaces.programId }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  if (!workspace) throw new Error("Workspace tidak ditemukan.");
  if (input.scope === "session") {
    const [session] = await db.select({ id: researchSessions.id, workspaceId: researchSessions.workspaceId }).from(researchSessions).where(and(eq(researchSessions.id, input.sessionId!), eq(researchSessions.workspaceId, workspaceId))).limit(1);
    if (!session) throw new Error("Research session tidak ditemukan pada workspace yang dipilih.");
  }
  if (input.scope === "program" && workspace.programId !== input.programId) throw new Error("Program tidak terhubung dengan workspace yang dipilih.");
  return { db, workspaceId, sessionId: input.sessionId ?? null, programId: input.programId ?? null };
}

async function loadMemoryForUser(userId: number, memoryId: number, intent: "read" | "respond" = "read") {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [memory] = await db.select().from(aiMemories).where(eq(aiMemories.id, memoryId)).limit(1);
  if (!memory || (memory.scope === "user" && memory.userId !== userId)) throw new Error("AI memory tidak ditemukan atau tidak dapat diakses.");
  if (memory.workspaceId !== null && !(await canAccessWorkspace(userId, memory.workspaceId, intent))) throw new Error("AI memory tidak ditemukan atau tidak dapat diakses.");
  return { db, memory };
}

async function indexMemory(memory: typeof aiMemories.$inferSelect) {
  if (memory.workspaceId === null || memory.status !== "active") {
    if (memory.workspaceId !== null) await deleteSearchDocument({ workspaceId: memory.workspaceId, entityType: "ai_memory", entityId: memory.id });
    return;
  }
  await upsertSearchDocument({
    workspaceId: memory.workspaceId,
    entityType: "ai_memory",
    entityId: memory.id,
    title: `${memory.scope}: ${memory.memoryKey}`,
    body: [memory.content, memory.sourceReference ?? "", `scope:${memory.scope}`, `memory-key:${memory.memoryKey}`].filter(Boolean).join("\n"),
  });
}

export async function listAiMemories(userId: number, input: { workspaceId?: number; scope?: AiMemoryScope; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const limit = Math.min(100, Math.max(1, Math.trunc(input.limit ?? 50)));
  if (input.workspaceId !== undefined) {
    if (!(await canAccessWorkspace(userId, input.workspaceId, "read"))) throw new Error("Workspace tidak ditemukan atau tidak dapat diakses.");
    return db.select().from(aiMemories).where(and(eq(aiMemories.workspaceId, input.workspaceId), eq(aiMemories.status, "active"), input.scope ? eq(aiMemories.scope, input.scope) : undefined)).orderBy(desc(aiMemories.updatedAt), desc(aiMemories.id)).limit(limit);
  }
  if (input.scope && input.scope !== "user") throw new Error("Workspace ID diperlukan untuk memory scope ini.");
  return db.select().from(aiMemories).where(and(eq(aiMemories.userId, userId), eq(aiMemories.scope, "user"), eq(aiMemories.status, "active"))).orderBy(desc(aiMemories.updatedAt), desc(aiMemories.id)).limit(limit);
}

export async function saveAiMemory(userId: number, input: MemoryInput) {
  const key = clean(input.memoryKey, 160);
  const content = clean(input.content, MAX_CONTENT_LENGTH);
  if (key.length < 2 || content.length < 2) throw new Error("Memory key dan content wajib diisi.");
  const sourceReference = clean(input.sourceReference, 512) || null;
  const retentionDays = Math.min(MAX_RETENTION_DAYS, Math.max(1, Math.trunc(input.retentionDays ?? 90)));
  const { db, workspaceId, sessionId, programId } = await resolveWriteScope(userId, { ...input, memoryKey: key, content });
  const keyValue = buildMemoryScopeKey({ ...input, memoryKey: key }, userId);
  const [existing] = await db.select().from(aiMemories).where(eq(aiMemories.scopeKey, keyValue)).limit(1);
  const now = new Date();
  const retentionUntil = new Date(now.getTime() + retentionDays * 86_400_000);
  if (existing) {
    if (input.expectedRevision === undefined) throw new Error("Expected revision wajib diisi saat memperbarui memory.");
    assertExpectedRevision(input.expectedRevision, existing.revision);
    const updateResult = await db.update(aiMemories).set({ status: "active", content, sourceReference, retentionUntil, archivedAt: null, revision: nextRevision(existing.revision), updatedAt: now }).where(and(eq(aiMemories.id, existing.id), eq(aiMemories.revision, input.expectedRevision!)));
    if (updateResult[0].affectedRows !== 1) throw new Error("Concurrent memory update detected; reload and retry.");
    const [updated] = await db.select().from(aiMemories).where(eq(aiMemories.id, existing.id)).limit(1);
    if (!updated) throw new Error("AI memory update failed.");
    await indexMemory(updated);
    return updated;
  }
  if ((input.expectedRevision ?? 0) !== 0) throw new Error("New memory must start at revision 0.");
  try {
    await db.insert(aiMemories).values({ scope: input.scope, status: "active", userId, workspaceId, sessionId, programId, memoryKey: key, scopeKey: keyValue, content, sourceReference, retentionUntil, revision: 0 });
  } catch {
    throw new Error("Memory key sudah dibuat oleh request lain; muat ulang lalu coba lagi.");
  }
  const [created] = await db.select().from(aiMemories).where(eq(aiMemories.scopeKey, keyValue)).limit(1);
  if (!created) throw new Error("AI memory could not be created.");
  await indexMemory(created);
  return created;
}

export async function archiveAiMemory(userId: number, input: { memoryId: number; expectedRevision: number }) {
  const { db, memory } = await loadMemoryForUser(userId, input.memoryId, "respond");
  if (memory.userId !== userId) {
    const [workspace] = memory.workspaceId ? await db.select({ ownerUserId: workspaces.ownerUserId }).from(workspaces).where(eq(workspaces.id, memory.workspaceId)).limit(1) : [];
    if (!workspace || workspace.ownerUserId !== userId) throw new Error("Hanya pembuat memory atau owner workspace yang dapat mengarsipkan memory.");
  }
  assertExpectedRevision(input.expectedRevision, memory.revision);
  const updatedResult = await db.update(aiMemories).set({ status: "archived", archivedAt: new Date(), revision: nextRevision(memory.revision), updatedAt: new Date() }).where(and(eq(aiMemories.id, memory.id), eq(aiMemories.revision, input.expectedRevision)));
  if (updatedResult[0].affectedRows !== 1) throw new Error("Concurrent memory update detected; reload and retry.");
  const [updated] = await db.select().from(aiMemories).where(eq(aiMemories.id, memory.id)).limit(1);
  if (!updated) throw new Error("AI memory archive failed.");
  await indexMemory(updated);
  return updated;
}

export async function purgeExpiredAiMemories(limit = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const boundedLimit = Math.min(500, Math.max(1, Math.trunc(limit)));
  const expired = await db.select().from(aiMemories).where(and(lte(aiMemories.retentionUntil, new Date()), eq(aiMemories.status, "active"))).orderBy(asc(aiMemories.retentionUntil), asc(aiMemories.id)).limit(boundedLimit);
  for (const memory of expired) {
    await db.update(aiMemories).set({ status: "purged", content: "retention://purged", sourceReference: null, archivedAt: new Date(), revision: nextRevision(memory.revision), updatedAt: new Date() }).where(and(eq(aiMemories.id, memory.id), eq(aiMemories.status, "active"), eq(aiMemories.revision, memory.revision)));
    if (memory.workspaceId !== null) await deleteSearchDocument({ workspaceId: memory.workspaceId, entityType: "ai_memory", entityId: memory.id });
  }
  return { inspected: expired.length, purged: expired.length };
}
