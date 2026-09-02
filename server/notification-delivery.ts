import { and, eq } from "drizzle-orm";
import { notificationDeliveries, notifications, type notificationDeliveryChannel } from "../drizzle/schema";
import { getDb } from "./db";

type NotificationChannel = (typeof notificationDeliveryChannel)[number];
type NotificationRecord = typeof notifications.$inferSelect;
type DeliveryResult = { delivered: boolean; reason?: string; providerMessageId?: string };

export function getNotificationRetryDelayMs(attempts: number): number {
  const normalizedAttempts = Number.isFinite(attempts) ? Math.max(0, Math.trunc(attempts)) : 0;
  return Math.min(3_600_000, 5_000 * 2 ** normalizedAttempts);
}

export type NotificationProvider = {
  channel: NotificationChannel;
  isEnabled: () => boolean;
  deliver: (notification: NotificationRecord, payload: Record<string, unknown>) => Promise<DeliveryResult>;
};

function redactText(value: string) {
  return value.replace(/(authorization|cookie|token|secret|password)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]").slice(0, 8_000);
}

export function buildRedactedNotificationPayload(notification: Pick<NotificationRecord, "eventType" | "severity" | "title" | "message" | "workspaceId">) {
  return JSON.stringify({ eventType: notification.eventType, severity: notification.severity, title: redactText(notification.title), message: redactText(notification.message), workspaceId: notification.workspaceId });
}

export const notificationProviders: Record<NotificationChannel, NotificationProvider> = {
  in_app: {
    channel: "in_app",
    isEnabled: () => true,
    deliver: async () => ({ delivered: true }),
  },
  email: {
    channel: "email",
    isEnabled: () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD),
    deliver: async () => ({ delivered: false, reason: "email-provider-delegated-to-email-delivery-ledger" }),
  },
  webhook: {
    channel: "webhook",
    isEnabled: () => false,
    deliver: async () => ({ delivered: false, reason: "webhook-provider-disabled-until-approved-activation" }),
  },
};

export async function createNotificationDeliveryLedger(notification: NotificationRecord) {
  const db = await getDb();
  if (!db) return [];
  const payload = buildRedactedNotificationPayload(notification);
  const rows: Array<typeof notificationDeliveries.$inferSelect> = [];
  for (const channel of Object.keys(notificationProviders) as NotificationChannel[]) {
    const idempotencyKey = `notification:${notification.id}:${channel}`;
    const [existing] = await db.select().from(notificationDeliveries).where(eq(notificationDeliveries.idempotencyKey, idempotencyKey)).limit(1);
    if (existing) { rows.push(existing); continue; }
    const provider = notificationProviders[channel];
    const status = channel === "in_app" && provider.isEnabled() ? "sent" : provider.isEnabled() ? "queued" : "disabled";
    await db.insert(notificationDeliveries).values({ notificationId: notification.id, userId: notification.userId, workspaceId: notification.workspaceId, channel, status, idempotencyKey, attempts: status === "sent" ? 1 : 0, nextAttemptAt: new Date(), redactedPayload: payload });
    const [created] = await db.select().from(notificationDeliveries).where(eq(notificationDeliveries.idempotencyKey, idempotencyKey)).limit(1);
    if (created) rows.push(created);
  }
  return rows;
}

export async function executeNotificationDeliveryJob(payload: Record<string, unknown>) {
  const deliveryId = Number(payload.deliveryId);
  if (!Number.isInteger(deliveryId) || deliveryId < 1) throw new Error("Invalid notification delivery job payload.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [delivery] = await db.select().from(notificationDeliveries).where(eq(notificationDeliveries.id, deliveryId)).limit(1);
  if (!delivery) throw new Error("Notification delivery tidak ditemukan.");
  if (delivery.status === "sent" || delivery.status === "disabled") return delivery;
  const provider = notificationProviders[delivery.channel];
  if (!provider || !provider.isEnabled()) {
    await db.update(notificationDeliveries).set({ status: "disabled", lastError: "Provider is disabled or not configured.", updatedAt: new Date() }).where(eq(notificationDeliveries.id, delivery.id));
    return { ...delivery, status: "disabled" as const };
  }
  const [notification] = await db.select().from(notifications).where(eq(notifications.id, delivery.notificationId)).limit(1);
  if (!notification) throw new Error("Notification source tidak ditemukan.");
  let parsedPayload: Record<string, unknown>;
  try { parsedPayload = JSON.parse(delivery.redactedPayload) as Record<string, unknown>; } catch { throw new Error("Notification delivery payload is invalid."); }
  await db.update(notificationDeliveries).set({ status: "sending", attempts: delivery.attempts + 1, updatedAt: new Date() }).where(and(eq(notificationDeliveries.id, delivery.id), eq(notificationDeliveries.status, delivery.status)));
  const result = await provider.deliver(notification, parsedPayload);
  if (result.delivered) {
    await db.update(notificationDeliveries).set({ status: "sent", providerMessageId: result.providerMessageId ?? null, lastError: null, updatedAt: new Date() }).where(eq(notificationDeliveries.id, delivery.id));
    return { ...delivery, status: "sent" as const, providerMessageId: result.providerMessageId ?? null };
  }
  const reason = result.reason ?? "Notification provider delivery failed.";
  await db.update(notificationDeliveries).set({ status: "failed", lastError: reason, nextAttemptAt: new Date(Date.now() + getNotificationRetryDelayMs(delivery.attempts)), updatedAt: new Date() }).where(eq(notificationDeliveries.id, delivery.id));
  throw new Error(reason);
}
