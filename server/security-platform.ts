import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { apiKeys, organizationEntitlements, organizationMembers, privacyRequests, users } from "../drizzle/schema";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

async function requireOrganizationMember(userId: number, organizationId: number, manage = false) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [member] = await db.select().from(organizationMembers).where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId))).limit(1);
  if (!member || (manage && member.role !== "owner" && member.role !== "admin")) throw new Error("Organization permission denied.");
  return db;
}

export async function authenticateApiKey(rawSecret: string) {
  const db = await getDb();
  if (!db || rawSecret.length < 12 || rawSecret.length > 256) return null;
  const [key] = await db.select().from(apiKeys).where(eq(apiKeys.secretHash, hashSecret(rawSecret))).limit(1);
  if (!key || key.status !== "active" || (key.expiresAt && key.expiresAt.getTime() <= Date.now())) return null;
  const [user] = await db.select().from(users).where(eq(users.id, key.userId)).limit(1);
  if (!user) return null;
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, key.id));
  return user;
}

export async function listApiKeys(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix, workspaceId: apiKeys.workspaceId, scopes: apiKeys.scopes, status: apiKeys.status, expiresAt: apiKeys.expiresAt, lastUsedAt: apiKeys.lastUsedAt, revokedAt: apiKeys.revokedAt, createdAt: apiKeys.createdAt }).from(apiKeys).where(eq(apiKeys.userId, userId)).orderBy(desc(apiKeys.createdAt));
}

export async function createApiKey(userId: number, input: { name: string; workspaceId?: number; scopes: string[]; expiresAt?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const name = input.name.trim();
  if (name.length < 3) throw new Error("API key name is required.");
  const scopes = Array.from(new Set(input.scopes.map(scope => scope.trim()).filter(Boolean)));
  if (scopes.length === 0) throw new Error("At least one API key scope is required.");
  if (input.workspaceId !== undefined && !(await canAccessWorkspace(userId, input.workspaceId, "manage"))) throw new Error("API key workspace access denied.");
  const rawSecret = `am_${randomBytes(24).toString("base64url")}`;
  const prefix = rawSecret.slice(0, 10);
  await db.insert(apiKeys).values({ userId, workspaceId: input.workspaceId ?? null, name, prefix, secretHash: hashSecret(rawSecret), scopes: JSON.stringify(scopes), status: "active", expiresAt: input.expiresAt ?? null });
  const [created] = await db.select({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix, workspaceId: apiKeys.workspaceId, scopes: apiKeys.scopes, status: apiKeys.status, expiresAt: apiKeys.expiresAt, createdAt: apiKeys.createdAt }).from(apiKeys).where(eq(apiKeys.secretHash, hashSecret(rawSecret))).limit(1);
  if (!created) throw new Error("API key could not be created.");
  return { ...created, secret: rawSecret };
}

export async function revokeApiKey(userId: number, apiKeyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [key] = await db.select().from(apiKeys).where(and(eq(apiKeys.id, apiKeyId), eq(apiKeys.userId, userId))).limit(1);
  if (!key) throw new Error("API key tidak ditemukan.");
  await db.update(apiKeys).set({ status: "revoked", revokedAt: new Date() }).where(and(eq(apiKeys.id, apiKeyId), eq(apiKeys.userId, userId)));
  return { success: true as const, apiKeyId };
}

export async function getEntitlement(userId: number, organizationId: number) {
  const db = await requireOrganizationMember(userId, organizationId);
  const [entitlement] = await db.select().from(organizationEntitlements).where(eq(organizationEntitlements.organizationId, organizationId)).limit(1);
  if (entitlement) return entitlement;
  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  await db.insert(organizationEntitlements).values({ organizationId, plan: "free", featureFlags: JSON.stringify(["workspace", "research", "evidence", "reports"]), limits: JSON.stringify({ members: 5, workspaces: 3, aiRunsPerMonth: 100, storageBytes: 1_000_000_000 }), periodStart, periodEnd });
  const [created] = await db.select().from(organizationEntitlements).where(eq(organizationEntitlements.organizationId, organizationId)).limit(1);
  return created;
}

export async function updateEntitlement(userId: number, input: { organizationId: number; plan: "free" | "team" | "enterprise"; featureFlags: string[]; limits: Record<string, number>; periodEnd: Date }) {
  const db = await requireOrganizationMember(userId, input.organizationId, true);
  const periodStart = new Date();
  await db.insert(organizationEntitlements).values({ organizationId: input.organizationId, plan: input.plan, featureFlags: JSON.stringify(input.featureFlags), limits: JSON.stringify(input.limits), periodStart, periodEnd: input.periodEnd }).onDuplicateKeyUpdate({ set: { plan: input.plan, featureFlags: JSON.stringify(input.featureFlags), limits: JSON.stringify(input.limits), periodStart, periodEnd: input.periodEnd, updatedAt: new Date() } });
  return getEntitlement(userId, input.organizationId);
}

export async function requestPrivacyAction(userId: number, input: { requestType: "export" | "delete" | "rectify"; reason: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const reason = input.reason.trim();
  if (reason.length < 3) throw new Error("Privacy request reason is required.");
  await db.insert(privacyRequests).values({ userId, requestType: input.requestType, status: "requested", reason });
  const [request] = await db.select().from(privacyRequests).where(and(eq(privacyRequests.userId, userId), eq(privacyRequests.requestType, input.requestType))).orderBy(desc(privacyRequests.createdAt)).limit(1);
  return request;
}

export async function listPrivacyRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(privacyRequests).where(eq(privacyRequests.userId, userId)).orderBy(desc(privacyRequests.createdAt));
}
