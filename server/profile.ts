import { and, desc, eq } from "drizzle-orm";
import { findings, researchSessions, userProfiles, workspaces } from "../drizzle/schema";
import { getDb } from "./db";

async function getProfileRow(userId: number) {
  if (!Number.isInteger(userId) || userId < 1) throw new Error("userId must be a positive integer.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (profile) return { db, profile };
  await db.insert(userProfiles).values({ userId, username: null, avatarReference: null, bio: "", specialization: null, skills: "[]", experience: "[]", visibility: "organization" });
  const [created] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (!created) throw new Error("Profile could not be initialized.");
  return { db, profile: created };
}

function uniqueLines(values: string[]) {
  if (!Array.isArray(values) || !values.every(value => typeof value === "string")) throw new Error("Profile list fields must contain strings.");
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean))).slice(0, 100);
}

export async function getUserProfile(userId: number) {
  const { db, profile } = await getProfileRow(userId);
  const [researchHistory, findingHistory] = await Promise.all([
    db.select({ id: researchSessions.id, title: researchSessions.title, state: researchSessions.state, updatedAt: researchSessions.updatedAt }).from(researchSessions).where(eq(researchSessions.ownerUserId, userId)).orderBy(desc(researchSessions.updatedAt)).limit(20),
    db.select({ id: findings.id, title: findings.title, status: findings.status, updatedAt: findings.updatedAt }).from(findings).innerJoin(workspaces, eq(findings.workspaceId, workspaces.id)).where(eq(workspaces.ownerUserId, userId)).orderBy(desc(findings.updatedAt)).limit(20),
  ]);
  return { ...profile, skills: JSON.parse(profile.skills || "[]") as string[], experience: JSON.parse(profile.experience || "[]") as string[], researchHistory, findingHistory, statistics: { researchSessions: researchHistory.length, findings: findingHistory.length } };
}

export async function updateUserProfile(userId: number, input: { username?: string; avatarReference?: string; bio: string; specialization?: string; skills: string[]; experience: string[]; visibility: "private" | "organization" | "public" }) {
  if (!input || typeof input.bio !== "string" || !["private", "organization", "public"].includes(input.visibility)) throw new Error("Profile input is invalid.");
  if (input.username !== undefined && typeof input.username !== "string") throw new Error("Profile input is invalid.");
  if (input.avatarReference !== undefined && typeof input.avatarReference !== "string") throw new Error("Profile input is invalid.");
  if (input.specialization !== undefined && typeof input.specialization !== "string") throw new Error("Profile input is invalid.");
  const { db } = await getProfileRow(userId);
  const username = input.username?.trim().toLowerCase() || null;
  if (username && !/^[a-z0-9_][a-z0-9_.-]{2,63}$/.test(username)) throw new Error("Username hanya boleh berisi huruf kecil, angka, titik, dash, atau underscore.");
  await db.update(userProfiles).set({ username, avatarReference: input.avatarReference?.trim() || null, bio: input.bio.trim().slice(0, 4_000), specialization: input.specialization?.trim().slice(0, 160) || null, skills: JSON.stringify(uniqueLines(input.skills)), experience: JSON.stringify(uniqueLines(input.experience)), visibility: input.visibility, updatedAt: new Date() }).where(eq(userProfiles.userId, userId));
  return getUserProfile(userId);
}
