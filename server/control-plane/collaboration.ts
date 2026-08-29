import { and, asc, eq } from "drizzle-orm";
import { findingComments, findings } from "../../drizzle/schema";
import { getDb } from "../db";
import { canAccessWorkspace } from "./operations";

export async function listFindingComments(userId: number, findingId: number, workspaceId: number) {
  if (!(await canAccessWorkspace(userId, workspaceId, "read"))) throw new Error("Workspace tidak dapat diakses oleh user ini.");
  const db = await getDb();
  if (!db) return [];
  const [finding] = await db.select({ id: findings.id }).from(findings).where(and(eq(findings.id, findingId), eq(findings.workspaceId, workspaceId))).limit(1);
  if (!finding) throw new Error("Finding tidak ditemukan pada workspace ini.");
  return db.select().from(findingComments).where(and(eq(findingComments.findingId, findingId), eq(findingComments.workspaceId, workspaceId))).orderBy(asc(findingComments.createdAt));
}

export async function addFindingComment(userId: number, input: { findingId: number; workspaceId: number; body: string }) {
  if (!(await canAccessWorkspace(userId, input.workspaceId, "read"))) throw new Error("Workspace tidak dapat diakses oleh user ini.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [finding] = await db.select({ id: findings.id }).from(findings).where(and(eq(findings.id, input.findingId), eq(findings.workspaceId, input.workspaceId))).limit(1);
  if (!finding) throw new Error("Finding tidak ditemukan pada workspace ini.");
  const body = input.body.trim();
  const mentions = Array.from(new Set(Array.from(body.matchAll(/@([a-zA-Z0-9_.-]{2,64})/g), match => match[1].toLowerCase())));
  const result = await db.insert(findingComments).values({ findingId: input.findingId, workspaceId: input.workspaceId, authorUserId: userId, body, mentions: JSON.stringify(mentions) });
  return { id: Number(result[0].insertId), mentions, success: true as const };
}
