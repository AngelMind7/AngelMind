import { and, desc, eq } from "drizzle-orm";
import { auditEvents, savedViews } from "../drizzle/schema";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";
import { sha256 } from "./control-plane/archive-integrity";

function cleanName(value: string) {
  const name = value.trim();
  if (name.length < 2 || name.length > 120) throw new Error("Saved view name must be between 2 and 120 characters.");
  return name;
}

function cleanQuery(value: string) {
  const query = value.trim();
  if (query.length > 512) throw new Error("Saved view query is too long.");
  return query;
}

function cleanFilters(value: Record<string, unknown> | undefined) {
  const filters = value ?? {};
  const serialized = JSON.stringify(filters);
  if (serialized.length > 8_000) throw new Error("Saved view filters are too large.");
  return serialized;
}

async function requireAccess(userId: number, workspaceId: number) {
  if (!Number.isInteger(workspaceId) || workspaceId <= 0 || !(await canAccessWorkspace(userId, workspaceId, "read"))) throw new Error("Workspace tidak ditemukan atau tidak dapat diakses.");
}

export async function listSavedViews(userId: number, workspaceId: number) {
  await requireAccess(userId, workspaceId);
  const db = await getDb();
  if (!db) return [];
  return db.select().from(savedViews).where(and(eq(savedViews.workspaceId, workspaceId), eq(savedViews.userId, userId))).orderBy(desc(savedViews.updatedAt));
}

export async function createSavedView(userId: number, input: { workspaceId: number; name: string; query: string; filters?: Record<string, unknown> }) {
  await requireAccess(userId, input.workspaceId);
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const name = cleanName(input.name);
  const query = cleanQuery(input.query);
  const filters = cleanFilters(input.filters);
  await db.insert(savedViews).values({ workspaceId: input.workspaceId, userId, name, query, filters }).onDuplicateKeyUpdate({ set: { query, filters, updatedAt: new Date() } });
  const auditDetails = JSON.stringify({ name, query });
  await db.insert(auditEvents).values({ workspaceId: input.workspaceId, category: "search", subject: "saved-view-upserted", details: auditDetails, evidenceHash: sha256(auditDetails) });
  const [view] = await db.select().from(savedViews).where(and(eq(savedViews.workspaceId, input.workspaceId), eq(savedViews.userId, userId), eq(savedViews.name, name))).limit(1);
  return view;
}

export async function deleteSavedView(userId: number, savedViewId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [view] = await db.select().from(savedViews).where(and(eq(savedViews.id, savedViewId), eq(savedViews.userId, userId))).limit(1);
  if (!view) throw new Error("Saved view tidak ditemukan.");
  await requireAccess(userId, view.workspaceId);
  await db.delete(savedViews).where(eq(savedViews.id, savedViewId));
  return { success: true as const, savedViewId };
}
