import { and, asc, eq } from "drizzle-orm";
import { findingComments, findings, notifications, users, workspaceMemberships } from "../../drizzle/schema";
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

export async function addFindingComment(userId: number, input: { findingId: number; workspaceId: number; body: string; parentCommentId?: number }) {
  if (!(await canAccessWorkspace(userId, input.workspaceId, "read"))) throw new Error("Workspace tidak dapat diakses oleh user ini.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [finding] = await db.select({ id: findings.id }).from(findings).where(and(eq(findings.id, input.findingId), eq(findings.workspaceId, input.workspaceId))).limit(1);
  if (!finding) throw new Error("Finding tidak ditemukan pada workspace ini.");
  if (input.parentCommentId !== undefined) {
    const [parent] = await db.select({ id: findingComments.id }).from(findingComments).where(and(eq(findingComments.id, input.parentCommentId), eq(findingComments.findingId, input.findingId), eq(findingComments.workspaceId, input.workspaceId))).limit(1);
    if (!parent) throw new Error("Parent comment tidak ditemukan pada finding ini.");
  }
  const body = input.body.trim();
  const mentions = Array.from(new Set(Array.from(body.matchAll(/@([a-zA-Z0-9_.-]{2,64})/g), match => match[1].toLowerCase())));
  const result = await db.insert(findingComments).values({ findingId: input.findingId, workspaceId: input.workspaceId, parentCommentId: input.parentCommentId ?? null, authorUserId: userId, body, mentions: JSON.stringify(mentions) });
  if (mentions.length > 0) {
    const members = await db.select({ userId: workspaceMemberships.userId, name: users.name, email: users.email }).from(workspaceMemberships).innerJoin(users, eq(users.id, workspaceMemberships.userId)).where(eq(workspaceMemberships.workspaceId, input.workspaceId));
    const recipients = members.filter(member => member.userId !== userId && mentions.some(mention => mention === member.name?.trim().toLowerCase() || mention === member.email?.trim().toLowerCase()));
    if (recipients.length > 0) await db.insert(notifications).values(recipients.map(recipient => ({ userId: recipient.userId, workspaceId: input.workspaceId, eventType: "comment_mentioned" as const, severity: "info" as const, title: "You were mentioned in a finding comment", message: `You were mentioned on finding #${input.findingId}.` })));
  }
  return { id: Number(result[0].insertId), mentions, success: true as const };
}
