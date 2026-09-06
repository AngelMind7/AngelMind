import { and, desc, eq, sql } from "drizzle-orm";
import { reputationEvents, reputationProfiles, userAchievements } from "../drizzle/schema";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";

export const reputationEventTypes = ["finding_validated", "finding_resolved", "evidence_verified", "review_completed", "research_completed"] as const;
export type ReputationEventType = (typeof reputationEventTypes)[number];

const POINTS: Record<ReputationEventType, number> = {
  finding_validated: 20,
  finding_resolved: 10,
  evidence_verified: 5,
  review_completed: 8,
  research_completed: 15,
};

export function reputationLevel(points: number) {
  if (points >= 1_000) return "expert" as const;
  if (points >= 500) return "advanced" as const;
  if (points >= 200) return "practitioner" as const;
  return "contributor" as const;
}

export function pointsForEvent(eventType: ReputationEventType) {
  return POINTS[eventType];
}

function assertWorkspaceAccess(userId: number, workspaceId: number) {
  if (!Number.isInteger(userId) || userId < 1 || !Number.isInteger(workspaceId) || workspaceId < 1 || !canAccessWorkspace(userId, workspaceId, "read")) {
    throw new Error("Workspace access denied.");
  }
}

export async function recordReputationEvent(actorUserId: number, input: { workspaceId: number; userId: number; eventType: ReputationEventType; referenceType?: string; referenceId?: number; }) {
  assertWorkspaceAccess(actorUserId, input.workspaceId);
  if (!Number.isInteger(input.userId) || input.userId < 1 || !reputationEventTypes.includes(input.eventType)) throw new Error("Reputation event input is invalid.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const points = pointsForEvent(input.eventType);
  await db.insert(reputationEvents).values({ workspaceId: input.workspaceId, userId: input.userId, eventType: input.eventType, points, referenceType: input.referenceType ?? null, referenceId: input.referenceId ?? null });
  await db.insert(reputationProfiles).values({ userId: input.userId, totalPoints: points, level: reputationLevel(points), updatedAt: new Date() }).onDuplicateKeyUpdate({ set: { totalPoints: sql`${reputationProfiles.totalPoints} + ${points}`, level: sql`CASE WHEN ${reputationProfiles.totalPoints} + ${points} >= 1000 THEN 'expert' WHEN ${reputationProfiles.totalPoints} + ${points} >= 500 THEN 'advanced' WHEN ${reputationProfiles.totalPoints} + ${points} >= 200 THEN 'practitioner' ELSE 'contributor' END`, updatedAt: new Date() } });
  return getProfile(actorUserId, input.workspaceId, input.userId);
}

export async function getProfile(actorUserId: number, workspaceId: number, userId: number) {
  assertWorkspaceAccess(actorUserId, workspaceId);
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [profile] = await db.select().from(reputationProfiles).where(eq(reputationProfiles.userId, userId)).limit(1);
  const events = await db.select().from(reputationEvents).where(and(eq(reputationEvents.workspaceId, workspaceId), eq(reputationEvents.userId, userId))).orderBy(desc(reputationEvents.createdAt)).limit(100);
  const achievements = await db.select().from(userAchievements).where(eq(userAchievements.userId, userId)).orderBy(desc(userAchievements.awardedAt)).limit(50);
  return { profile: profile ?? { userId, totalPoints: 0, level: "contributor" as const }, events, achievements };
}

export async function listLeaderboard(actorUserId: number, workspaceId: number, limit = 25) {
  assertWorkspaceAccess(actorUserId, workspaceId);
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const rows = await db.select({ userId: reputationProfiles.userId, totalPoints: reputationProfiles.totalPoints, level: reputationProfiles.level }).from(reputationProfiles).innerJoin(reputationEvents, eq(reputationEvents.userId, reputationProfiles.userId)).where(eq(reputationEvents.workspaceId, workspaceId)).groupBy(reputationProfiles.userId, reputationProfiles.totalPoints, reputationProfiles.level).orderBy(desc(reputationProfiles.totalPoints)).limit(Math.min(Math.max(limit, 1), 100));
  return rows;
}
