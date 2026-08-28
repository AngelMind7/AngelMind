import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { accountSecurityEvents, authDevices, onboardingProfiles } from "../drizzle/schema";
import { getDb } from "./db";

const MAX_DEVICE_LABEL_LENGTH = 120;
const MAX_USER_AGENT_LENGTH = 512;
const MAX_ROLE_INTENT_LENGTH = 80;
const onboardingSteps = ["profile", "organization", "workspace", "complete"] as const;

function hashValue(value: string | undefined) {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex");
}

function normalizeText(value: string | undefined, maxLength: number) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

async function recordSecurityEvent(userId: number, eventType: (typeof accountSecurityEvents)["$inferInsert"]["eventType"], metadata: Record<string, unknown>, deviceId?: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(accountSecurityEvents).values({
    userId,
    eventType,
    deviceId: deviceId ?? null,
    metadata: JSON.stringify(metadata),
  });
}

export async function getAccountSecurity(userId: number) {
  const db = await getDb();
  if (!db) {
    return { profile: null, devices: [], events: [], databaseAvailable: false as const };
  }

  const [profileRows, devices, events] = await Promise.all([
    db.select().from(onboardingProfiles).where(eq(onboardingProfiles.userId, userId)).limit(1),
    db.select().from(authDevices).where(eq(authDevices.userId, userId)).orderBy(desc(authDevices.lastSeenAt)).limit(20),
    db.select().from(accountSecurityEvents).where(eq(accountSecurityEvents.userId, userId)).orderBy(desc(accountSecurityEvents.createdAt)).limit(40),
  ]);

  return {
    profile: profileRows[0] ?? null,
    devices,
    events,
    databaseAvailable: true as const,
  };
}

export async function registerAuthDevice(userId: number, input: { fingerprint: string; label?: string; platform?: "web" | "ios" | "android" | "unknown"; userAgent?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const fingerprint = hashValue(input.fingerprint);
  if (!fingerprint) throw new Error("Device fingerprint is required.");
  const label = normalizeText(input.label, MAX_DEVICE_LABEL_LENGTH) ?? "Current browser";
  const userAgent = normalizeText(input.userAgent, MAX_USER_AGENT_LENGTH);

  await db.insert(authDevices).values({
    userId,
    deviceFingerprint: fingerprint,
    label,
    platform: input.platform ?? "unknown",
    userAgent,
    lastSeenAt: new Date(),
    trusted: 1,
    revokedAt: null,
  }).onDuplicateKeyUpdate({
    set: { label, platform: input.platform ?? "unknown", userAgent, lastSeenAt: new Date(), trusted: 1, revokedAt: null },
  });

  const [device] = await db.select().from(authDevices).where(and(eq(authDevices.userId, userId), eq(authDevices.deviceFingerprint, fingerprint))).limit(1);
  if (!device) throw new Error("Device registration could not be confirmed.");
  await recordSecurityEvent(userId, "device_registered", { platform: device.platform, label: device.label }, device.id);
  return device;
}

export async function revokeAuthDevice(userId: number, deviceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [device] = await db.select().from(authDevices).where(and(eq(authDevices.id, deviceId), eq(authDevices.userId, userId))).limit(1);
  if (!device) throw new Error("Device tidak ditemukan.");
  await db.update(authDevices).set({ trusted: 0, revokedAt: new Date() }).where(and(eq(authDevices.id, deviceId), eq(authDevices.userId, userId)));
  await recordSecurityEvent(userId, "device_revoked", { label: device.label }, deviceId);
  return { success: true as const, deviceId };
}

export async function saveOnboardingProfile(userId: number, input: { status: "not_started" | "in_progress" | "completed" | "skipped"; currentStep: (typeof onboardingSteps)[number]; organizationName?: string; roleIntent?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const organizationName = normalizeText(input.organizationName, 160);
  const roleIntent = normalizeText(input.roleIntent, MAX_ROLE_INTENT_LENGTH);
  const completedAt = input.status === "completed" || input.status === "skipped" ? new Date() : null;
  await db.insert(onboardingProfiles).values({
    userId,
    status: input.status,
    currentStep: input.currentStep,
    organizationName,
    roleIntent,
    completedAt,
  }).onDuplicateKeyUpdate({
    set: { status: input.status, currentStep: input.currentStep, organizationName, roleIntent, completedAt, updatedAt: new Date() },
  });
  await recordSecurityEvent(userId, "profile_updated", { onboardingStatus: input.status, currentStep: input.currentStep });
  const [profile] = await db.select().from(onboardingProfiles).where(eq(onboardingProfiles.userId, userId)).limit(1);
  return profile;
}

export async function recordAuthEvent(userId: number, eventType: "login" | "logout" | "token_rejected" | "password_reset_requested" | "mfa_enrolled" | "mfa_unenrolled", metadata: Record<string, unknown> = {}) {
  await recordSecurityEvent(userId, eventType, metadata);
  return { success: true as const };
}
