import { notificationEvents, type NotificationEvent } from "./notifications";

const privateIpv4 = /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[0-1])\.)/;
const privateIpv6 = /^(?:(?:fc|fd)[0-9a-f]{0,2}:|fe80:|::1$)/i;

export function assertSafeWebhookEndpoint(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Webhook endpoint must be a valid absolute URL."); }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (url.protocol !== "https:") throw new Error("Webhook endpoint must use HTTPS.");
  if (url.port && url.port !== "443") throw new Error("Webhook endpoint must use the default HTTPS port.");
  if (url.username || url.password || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal") || privateIpv4.test(hostname) || privateIpv6.test(hostname)) throw new Error("Webhook endpoint cannot resolve to a local or private address.");
  return url;
}

export function normalizeWebhookEvents(events: NotificationEvent[]): NotificationEvent[] {
  const unique = events.filter((event, index) => events.indexOf(event) === index);
  if (unique.length === 0 || unique.some(event => !notificationEvents.includes(event))) throw new Error("Webhook must subscribe to one or more supported notification events.");
  return unique;
}
