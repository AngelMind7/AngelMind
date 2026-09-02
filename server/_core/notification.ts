import { TRPCError } from "@trpc/server";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20_000;

function validatePayload(input: NotificationPayload): NotificationPayload {
  if (!input || typeof input.title !== "string" || typeof input.content !== "string") throw new TRPCError({ code: "BAD_REQUEST", message: "Notification payload is invalid." });
  const title = input.title.trim();
  const content = input.content.trim();
  if (!title) throw new TRPCError({ code: "BAD_REQUEST", message: "Notification title is required." });
  if (!content) throw new TRPCError({ code: "BAD_REQUEST", message: "Notification content is required." });
  if (title.length > TITLE_MAX_LENGTH) throw new TRPCError({ code: "BAD_REQUEST", message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.` });
  if (content.length > CONTENT_MAX_LENGTH) throw new TRPCError({ code: "BAD_REQUEST", message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.` });
  return { title, content };
}

/**
 * Delivers an optional outbound notification through a user-owned webhook.
 * In-app notifications remain the source of truth when no webhook is configured.
 */
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  const validated = validatePayload(payload);
  const endpoint = process.env.NOTIFICATION_WEBHOOK_URL?.trim();
  if (!endpoint) return false;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:") throw new Error("Notification webhook must use HTTPS.");
  } catch {
    console.warn("[Notification] Webhook URL is invalid or insecure.");
    return false;
  }

  const secret = process.env.NOTIFICATION_WEBHOOK_SECRET?.trim();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(secret ? { "x-angelmind-signature": secret } : {}),
      },
      body: JSON.stringify({ ...validated, source: "angelmind" }),
    });
    if (!response.ok) {
      console.warn(`[Notification] Webhook failed with ${response.status} ${response.statusText}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Webhook delivery failed", String(error));
    return false;
  }
}
