import { and, eq, sql } from "drizzle-orm";
import { accountSecurityEvents, apiKeys, authDevices, onboardingProfiles, organizationMembers, organizations, privacyRequests, savedViews, userProfiles, users, workspaceMemberships, workspaces } from "../drizzle/schema";
import { getDb } from "./db";
import { storagePut } from "./storage";
import { processPrivacyRequest } from "./security-platform";
import { recordPrivacyEvent } from "./account-security";

const exportTables = [
  ["users", "id"], ["userProfiles", "userId"], ["authDevices", "userId"], ["accountSecurityEvents", "userId"], ["emailDeliveries", "userId"], ["organizationInvitations", "invitedByUserId"],
  ["onboardingProfiles", "userId"], ["apiKeys", "userId"], ["organizationMembers", "userId"], ["workspaceMemberships", "userId"],
  ["savedViews", "userId"], ["notificationPreferences", "userId"], ["notifications", "userId"], ["privacyRequests", "userId"],
] as const;

const deleteTables = [
  ["notificationPreferences", "userId"], ["notifications", "userId"], ["emailDeliveries", "userId"], ["organizationInvitations", "invitedByUserId"], ["savedViews", "userId"], ["workspaceMemberships", "userId"],
  ["organizationMembers", "userId"], ["apiKeys", "userId"], ["authDevices", "userId"], ["accountSecurityEvents", "userId"],
  ["onboardingProfiles", "userId"], ["userProfiles", "userId"],
] as const;

function fixedIdentifier(value: string) {
  return `\`${value.replace(/`/g, "") }\``;
}

async function collectUserExport(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const result: Record<string, unknown> = {};
  for (const [table, column] of exportTables) {
    const rows = await db.execute(sql.raw(`SELECT * FROM ${fixedIdentifier(table)} WHERE ${fixedIdentifier(column)} = ${userId}`));
    result[table] = rows[0] ?? [];
  }
  return result;
}

export async function executePrivacyExport(requestId: number) {
  if (!Number.isInteger(requestId) || requestId < 1) throw new Error("Privacy request id is invalid.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [request] = await db.select().from(privacyRequests).where(and(eq(privacyRequests.id, requestId), eq(privacyRequests.requestType, "export"))).limit(1);
  if (!request) throw new Error("Export request tidak ditemukan.");
  const data = await collectUserExport(request.userId);
  const artifact = await storagePut(`privacy-exports/${request.userId}/${request.id}.json`, JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), userId: request.userId, data }), "application/json");
  void recordPrivacyEvent(request.userId, "privacy_export_completed", { requestId, artifactKey: artifact.key });
  return processPrivacyRequest({ requestId, status: "completed", resultReference: artifact.key });
}

export async function executePrivacyDelete(requestId: number) {
  if (!Number.isInteger(requestId) || requestId < 1) throw new Error("Privacy request id is invalid.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [request] = await db.select().from(privacyRequests).where(and(eq(privacyRequests.id, requestId), eq(privacyRequests.requestType, "delete"))).limit(1);
  if (!request) throw new Error("Delete request tidak ditemukan.");
  const ownedOrganizations = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.ownerUserId, request.userId)).limit(1);
  const ownedWorkspaces = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.ownerUserId, request.userId)).limit(1);
  if (ownedOrganizations.length || ownedWorkspaces.length) {
    void recordPrivacyEvent(request.userId, "privacy_delete_blocked", { requestId, ownsOrganization: ownedOrganizations.length > 0, ownsWorkspace: ownedWorkspaces.length > 0 });
    throw new Error("Account deletion requires transferring or archiving owned organizations/workspaces first.");
  }
  await db.transaction(async tx => {
    for (const [table, column] of deleteTables) {
      await tx.execute(sql.raw(`DELETE FROM ${fixedIdentifier(table)} WHERE ${fixedIdentifier(column)} = ${request.userId}`));
    }
    await tx.delete(users).where(eq(users.id, request.userId));
  });
  return processPrivacyRequest({ requestId, status: "completed", resultReference: `account-deleted:${request.userId}:${new Date().toISOString()}` });
}

export async function executePrivacyRequest(requestId: number) {
  if (!Number.isInteger(requestId) || requestId < 1) throw new Error("Privacy request id is invalid.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [request] = await db.select().from(privacyRequests).where(eq(privacyRequests.id, requestId)).limit(1);
  if (!request) throw new Error("Privacy request tidak ditemukan.");
  if (request.status === "completed" || request.status === "rejected") return request;
  if (request.status === "requested") await processPrivacyRequest({ requestId, status: "processing" });
  return request.requestType === "export" ? executePrivacyExport(requestId) : request.requestType === "delete" ? executePrivacyDelete(requestId) : processPrivacyRequest({ requestId, status: "rejected", resultReference: "rectify-not-supported-by-processor" });
}
