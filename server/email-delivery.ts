import { and, eq } from "drizzle-orm";
import { emailDeliveries } from "../drizzle/schema";
import { getDb } from "./db";
import { enqueueJob } from "./ai-platform";
import { sendEmail } from "./_core/email";

function affectedRowCount(result: unknown): number | undefined {
  if (!result || typeof result !== "object") return undefined;
  const value = result as { affectedRows?: unknown; rowsAffected?: unknown };
  if (typeof value.affectedRows === "number") return value.affectedRows;
  if (typeof value.rowsAffected === "number") return value.rowsAffected;
  return undefined;
}

function normalizeRecipient(value: string): string {
  if (typeof value !== "string") throw new Error("Email recipient is invalid.");
  const recipient = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error("Email recipient is invalid.");
  return recipient;
}

export async function enqueueEmailDelivery(userId: number, input: { recipient: string; templateKey: string; subject: string; text: string; html?: string; replyTo?: string; idempotencyKey: string; workspaceId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  if (!Number.isInteger(userId) || userId < 1 || !input || typeof input.idempotencyKey !== "string") throw new Error("Email delivery input is invalid.");
  const recipient = normalizeRecipient(input.recipient);
  const idempotencyKey = input.idempotencyKey.trim();
  if (idempotencyKey.length < 8 || idempotencyKey.length > 180) throw new Error("Email idempotency key must contain 8-180 characters.");
  const [existing] = await db.select().from(emailDeliveries).where(eq(emailDeliveries.idempotencyKey, idempotencyKey)).limit(1);
  if (existing) return existing;
  if (typeof input.templateKey !== "string" || typeof input.subject !== "string" || typeof input.text !== "string") throw new Error("Email delivery content is invalid.");
  const payload = { text: input.text, html: input.html, replyTo: input.replyTo };
  try {
    await db.insert(emailDeliveries).values({ userId, workspaceId: input.workspaceId ?? null, recipient, templateKey: input.templateKey.trim().slice(0, 120), subject: input.subject.trim().slice(0, 512), payload: JSON.stringify(payload), status: "queued", attempts: 0, nextAttemptAt: new Date(), idempotencyKey });
  } catch (error) {
    const [concurrent] = await db.select().from(emailDeliveries).where(eq(emailDeliveries.idempotencyKey, idempotencyKey)).limit(1);
    if (concurrent) return concurrent;
    throw error;
  }
  const [delivery] = await db.select().from(emailDeliveries).where(eq(emailDeliveries.idempotencyKey, idempotencyKey)).limit(1);
  if (!delivery) throw new Error("Email delivery could not be persisted.");
  await enqueueJob(userId, { workspaceId: input.workspaceId, kind: "email.deliver", idempotencyKey: `email-deliver:${delivery.id}`, payload: { type: "email_delivery", deliveryId: delivery.id } });
  return delivery;
}

export async function executeEmailDeliveryJob(payload: Record<string, unknown>) {
  const deliveryId = Number(payload.deliveryId);
  if (!Number.isInteger(deliveryId) || deliveryId < 1) throw new Error("Invalid email delivery job payload.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [delivery] = await db.select().from(emailDeliveries).where(eq(emailDeliveries.id, deliveryId)).limit(1);
  if (!delivery) throw new Error("Email delivery tidak ditemukan.");
  if (delivery.status === "sent") return delivery;
  if (delivery.status === "sending") throw new Error("Email delivery is already being processed.");
  let message: { text: string; html?: string; replyTo?: string };
  try { message = JSON.parse(delivery.payload) as typeof message; } catch { throw new Error("Email delivery payload is invalid."); }
  const claim = await db.update(emailDeliveries).set({ status: "sending", attempts: delivery.attempts + 1, updatedAt: new Date() }).where(and(eq(emailDeliveries.id, delivery.id), eq(emailDeliveries.status, delivery.status)));
  const claimedRows = affectedRowCount(claim);
  if (claimedRows !== 1) throw new Error(claimedRows === 0 ? "Email delivery is already being processed." : "Email delivery claim could not be verified safely.");
  const result = await sendEmail({ to: delivery.recipient, subject: delivery.subject, text: message.text, html: message.html, replyTo: message.replyTo });
  if (result.delivered) {
    await db.update(emailDeliveries).set({ status: "sent", providerMessageId: result.messageId ?? null, lastError: null, updatedAt: new Date() }).where(eq(emailDeliveries.id, delivery.id));
    return { ...delivery, status: "sent" as const, providerMessageId: result.messageId ?? null };
  }
  const reason = result.reason === "not-configured" ? "SMTP is not configured." : "SMTP delivery failed.";
  await db.update(emailDeliveries).set({ status: "failed", lastError: reason, nextAttemptAt: new Date(Date.now() + Math.min(3_600_000, 5_000 * 2 ** Math.max(0, delivery.attempts))), updatedAt: new Date() }).where(eq(emailDeliveries.id, delivery.id));
  throw new Error(reason);
}
