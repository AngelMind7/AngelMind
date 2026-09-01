import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { apiKeys, organizationEntitlements, organizationMembers, privacyRequests, users } from "../drizzle/schema";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";
import { storageGetSignedUrl } from "./storage";
import { decodePageCursor, pageResult } from "./_core/query-safety";

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function normalizeApiKeyScopes(scopes: string[]): string[] {
  const normalized = Array.from(new Set(scopes.map(scope => scope.trim().toLowerCase()).filter(Boolean)));
  if (!normalized.length || normalized.length > 32 || normalized.some(scope => !/^[a-z0-9._:-]{2,80}$/.test(scope))) throw new Error("API key scopes are invalid or exceed the allowed limit.");
  return normalized;
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

export async function listApiKeysPage(userId: number, input: { pageSize?: number; cursor?: string }) {
  const db = await getDb();
  if (!db) return { items: [], hasNextPage: false, nextCursor: null };
  const cursor = decodePageCursor(input.cursor);
  const where = cursor
    ? and(eq(apiKeys.userId, userId), or(lt(apiKeys.createdAt, new Date(cursor.createdAt)), and(eq(apiKeys.createdAt, new Date(cursor.createdAt)), lt(apiKeys.id, cursor.id))))
    : eq(apiKeys.userId, userId);
  const rows = await db.select({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix, workspaceId: apiKeys.workspaceId, scopes: apiKeys.scopes, status: apiKeys.status, expiresAt: apiKeys.expiresAt, lastUsedAt: apiKeys.lastUsedAt, revokedAt: apiKeys.revokedAt, createdAt: apiKeys.createdAt }).from(apiKeys).where(where).orderBy(desc(apiKeys.createdAt), desc(apiKeys.id)).limit(Math.min(Math.max(input.pageSize ?? 25, 1), 100) + 1);
  return pageResult(rows, input.pageSize ?? 25);
}

export async function createApiKey(userId: number, input: { name: string; workspaceId?: number; scopes: string[]; expiresAt?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const name = input.name.trim();
  if (name.length < 3) throw new Error("API key name is required.");
  const scopes = normalizeApiKeyScopes(input.scopes);
  if (input.workspaceId !== undefined && !(await canAccessWorkspace(userId, input.workspaceId, "manage"))) throw new Error("API key workspace access denied.");
  const rawSecret = `am_${randomBytes(24).toString("base64url")}`;
  const prefix = rawSecret.slice(0, 10);
  await db.insert(apiKeys).values({ userId, workspaceId: input.workspaceId ?? null, name, prefix, secretHash: hashSecret(rawSecret), scopes: JSON.stringify(scopes), status: "active", expiresAt: input.expiresAt ?? null });
  const [created] = await db.select({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix, workspaceId: apiKeys.workspaceId, scopes: apiKeys.scopes, status: apiKeys.status, expiresAt: apiKeys.expiresAt, createdAt: apiKeys.createdAt }).from(apiKeys).where(eq(apiKeys.secretHash, hashSecret(rawSecret))).limit(1);
  if (!created) throw new Error("API key could not be created.");
  return { ...created, secret: rawSecret };
}

export async function rotateApiKey(userId: number, apiKeyId: number, expiresAt?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [key] = await db.select().from(apiKeys).where(and(eq(apiKeys.id, apiKeyId), eq(apiKeys.userId, userId))).limit(1);
  if (!key || key.status !== "active") throw new Error("Active API key tidak ditemukan.");
  if (key.workspaceId !== null && !(await canAccessWorkspace(userId, key.workspaceId, "manage"))) throw new Error("API key workspace access denied.");
  let scopes: string[] = [];
  try {
    const parsed = JSON.parse(key.scopes);
    scopes = Array.isArray(parsed) ? parsed.filter((scope): scope is string => typeof scope === "string") : [];
    scopes = normalizeApiKeyScopes(scopes);
  } catch {
    scopes = [];
  }
  const rawSecret = `am_${randomBytes(24).toString("base64url")}`;
  await db.update(apiKeys).set({ status: "revoked", revokedAt: new Date() }).where(and(eq(apiKeys.id, key.id), eq(apiKeys.userId, userId), eq(apiKeys.status, "active")));
  await db.insert(apiKeys).values({ userId, workspaceId: key.workspaceId, name: key.name, prefix: rawSecret.slice(0, 10), secretHash: hashSecret(rawSecret), scopes: JSON.stringify(scopes), status: "active", expiresAt: expiresAt ?? key.expiresAt });
  const [rotated] = await db.select({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix, workspaceId: apiKeys.workspaceId, scopes: apiKeys.scopes, status: apiKeys.status, expiresAt: apiKeys.expiresAt, createdAt: apiKeys.createdAt }).from(apiKeys).where(eq(apiKeys.secretHash, hashSecret(rawSecret))).limit(1);
  if (!rotated) throw new Error("API key rotation could not be confirmed.");
  return { ...rotated, secret: rawSecret, replacedApiKeyId: key.id };
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
  const [activeRequest] = await db.select().from(privacyRequests).where(and(eq(privacyRequests.userId, userId), eq(privacyRequests.requestType, input.requestType), eq(privacyRequests.status, "requested"))).orderBy(desc(privacyRequests.createdAt)).limit(1);
  if (activeRequest) return activeRequest;
  await db.insert(privacyRequests).values({ userId, requestType: input.requestType, status: "requested", reason });
  const [request] = await db.select().from(privacyRequests).where(and(eq(privacyRequests.userId, userId), eq(privacyRequests.requestType, input.requestType))).orderBy(desc(privacyRequests.createdAt)).limit(1);
  return request;
}

export async function listPrivacyRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(privacyRequests).where(eq(privacyRequests.userId, userId)).orderBy(desc(privacyRequests.createdAt));
}

export async function listPrivacyRequestsPage(userId: number, input: { pageSize?: number; cursor?: string }) {
  const db = await getDb();
  if (!db) return { items: [], hasNextPage: false, nextCursor: null };
  const cursor = decodePageCursor(input.cursor);
  const where = cursor
    ? and(eq(privacyRequests.userId, userId), or(lt(privacyRequests.createdAt, new Date(cursor.createdAt)), and(eq(privacyRequests.createdAt, new Date(cursor.createdAt)), lt(privacyRequests.id, cursor.id))))
    : eq(privacyRequests.userId, userId);
  const rows = await db.select().from(privacyRequests).where(where).orderBy(desc(privacyRequests.createdAt), desc(privacyRequests.id)).limit(Math.min(Math.max(input.pageSize ?? 25, 1), 100) + 1);
  return pageResult(rows, input.pageSize ?? 25);
}

export async function getPrivacyExportDownloadUrl(userId: number, requestId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [request] = await db.select().from(privacyRequests).where(and(eq(privacyRequests.id, requestId), eq(privacyRequests.userId, userId), eq(privacyRequests.requestType, "export"))).limit(1);
  if (!request) throw new Error("Export request tidak ditemukan atau tidak dapat diakses.");
  if (request.status !== "completed" || !request.resultReference) throw new Error("Export belum selesai atau artifact belum tersedia.");
  const expectedPrefix = `privacy-exports/${userId}/`;
  if (!request.resultReference.startsWith(expectedPrefix) || request.resultReference.includes("..")) throw new Error("Export artifact reference tidak valid.");
  const url = await storageGetSignedUrl(request.resultReference, 15 * 60);
  return { requestId: request.id, status: request.status, expiresInSeconds: 15 * 60, url };
}

export async function processPrivacyRequest(input: { requestId: number; status: "processing" | "completed" | "rejected"; resultReference?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [request] = await db.select().from(privacyRequests).where(eq(privacyRequests.id, input.requestId)).limit(1);
  if (!request) throw new Error("Privacy request tidak ditemukan.");
  if (request.status === "completed" || request.status === "rejected") {
    if (request.status !== input.status) throw new Error("Terminal privacy request cannot be reopened.");
    return request;
  }
  if (input.status === "processing" && request.status !== "requested") throw new Error("Only requested privacy actions can enter processing.");
  if ((input.status === "completed" || input.status === "rejected") && request.status !== "processing") throw new Error("Privacy action must be processing before it can reach a terminal state.");
  if (input.status === "completed" && !input.resultReference?.trim()) throw new Error("Completed privacy request requires a result reference.");
  if (request.requestType === "delete" && input.status === "completed" && !input.resultReference?.trim()) throw new Error("Completed deletion requires a verification reference.");
  const resultReference = input.resultReference?.trim() || null;
  const completedAt = input.status === "completed" || input.status === "rejected" ? new Date() : null;
  await db.update(privacyRequests).set({ status: input.status, resultReference, completedAt }).where(and(eq(privacyRequests.id, request.id), eq(privacyRequests.status, request.status)));
  const [updated] = await db.select().from(privacyRequests).where(eq(privacyRequests.id, request.id)).limit(1);
  return updated;
}
