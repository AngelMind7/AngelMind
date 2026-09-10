import { and, desc, eq } from "drizzle-orm";
import { integrationConnections } from "../drizzle/schema";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";

export const integrationProviders = ["github", "gitlab", "slack", "discord", "custom"] as const;
export const integrationStatuses = ["draft", "connected", "disabled"] as const;
export type IntegrationProvider = (typeof integrationProviders)[number];

export function assertIntegrationAccess(userId: number, workspaceId: number, intent: "read" | "manage") {
  if (!Number.isInteger(userId) || userId < 1 || !Number.isInteger(workspaceId) || workspaceId < 1 || !canAccessWorkspace(userId, workspaceId, intent)) throw new Error("Workspace access denied.");
}

const assertAccess = assertIntegrationAccess;

export async function listConnections(userId: number, workspaceId: number) {
  assertAccess(userId, workspaceId, "read");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  return db.select().from(integrationConnections).where(eq(integrationConnections.workspaceId, workspaceId)).orderBy(desc(integrationConnections.updatedAt));
}

export async function upsertConnection(userId: number, input: { workspaceId: number; provider: IntegrationProvider; name: string; endpoint?: string; secretReference?: string; scopes: string[]; }) {
  assertAccess(userId, input.workspaceId, "manage");
  if (!integrationProviders.includes(input.provider) || input.name.trim().length < 2 || input.name.length > 160 || input.scopes.length > 50 || input.scopes.some(scope => scope.trim().length < 1 || scope.length > 80)) throw new Error("Integration input is invalid.");
  if (input.endpoint && !/^https:\/\//i.test(input.endpoint)) throw new Error("Integration endpoint must use HTTPS.");
  if (input.secretReference && input.secretReference.length > 512) throw new Error("Integration secret reference is too long.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.insert(integrationConnections).values({ workspaceId: input.workspaceId, provider: input.provider, name: input.name.trim(), endpoint: input.endpoint ?? null, secretReference: input.secretReference ?? null, scopes: JSON.stringify(input.scopes), status: "draft", createdByUserId: userId, updatedAt: new Date() }).onDuplicateKeyUpdate({ set: { name: input.name.trim(), endpoint: input.endpoint ?? null, secretReference: input.secretReference ?? null, scopes: JSON.stringify(input.scopes), updatedAt: new Date() } });
  return listConnections(userId, input.workspaceId);
}

export async function setStatus(userId: number, workspaceId: number, integrationId: number, status: (typeof integrationStatuses)[number]) {
  assertAccess(userId, workspaceId, "manage");
  if (!integrationStatuses.includes(status)) throw new Error("Integration status is invalid.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const result = await db.update(integrationConnections).set({ status, updatedAt: new Date() }).where(and(eq(integrationConnections.id, integrationId), eq(integrationConnections.workspaceId, workspaceId)));
  if (!result) throw new Error("Integration update failed.");
  return listConnections(userId, workspaceId);
}
