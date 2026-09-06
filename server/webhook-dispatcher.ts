import { prepareSignedWebhookRequest } from "./notification-delivery";
import { assertSafeWebhookEndpoint } from "./control-plane/webhook-policy";

type WebhookConfiguration = {
  endpoint: string;
  signingSecretReference: string | null;
  eventTypes: string;
  endpointConfirmed: number;
  enabled: number;
};

export type WebhookDispatchInput = {
  eventType: string;
  payload: Record<string, unknown>;
  configuration: WebhookConfiguration;
  resolveSecret: (reference: string) => Promise<string | null>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export type WebhookDispatchResult = {
  delivered: boolean;
  statusCode?: number;
  providerMessageId?: string;
  reason?: string;
};

function parseEventTypes(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((event): event is string => typeof event === "string") : [];
  } catch {
    return [];
  }
}

export function webhookRetryDelayMs(attempt: number): number {
  const safeAttempt = Number.isFinite(attempt) ? Math.max(0, Math.trunc(attempt)) : 0;
  return Math.min(3_600_000, 5_000 * 2 ** safeAttempt);
}

export async function dispatchWebhook(input: WebhookDispatchInput): Promise<WebhookDispatchResult> {
  const configuration = input.configuration;
  if (configuration.enabled !== 1 || configuration.endpointConfirmed !== 1) return { delivered: false, reason: "webhook-activation-required" };
  if (!configuration.signingSecretReference) return { delivered: false, reason: "webhook-signing-secret-required" };
  if (!parseEventTypes(configuration.eventTypes).includes(input.eventType)) return { delivered: false, reason: "event-not-subscribed" };
  const endpoint = assertSafeWebhookEndpoint(configuration.endpoint).toString();
  const secret = await input.resolveSecret(configuration.signingSecretReference);
  if (!secret) return { delivered: false, reason: "webhook-signing-secret-unavailable" };
  const request = prepareSignedWebhookRequest(endpoint, secret, { eventType: input.eventType, payload: input.payload });
  const fetchImpl = input.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = Math.min(30_000, Math.max(1_000, Math.trunc(input.timeoutMs ?? 10_000)));
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetchImpl(request.url, { method: "POST", headers: request.headers, body: request.body, signal: controller.signal, redirect: "error" });
    if (!response.ok) return { delivered: false, statusCode: response.status, reason: `webhook-http-${response.status}` };
    return { delivered: true, statusCode: response.status, providerMessageId: response.headers.get("x-request-id") ?? undefined };
  } catch (error) {
    return { delivered: false, reason: error instanceof Error && error.name === "AbortError" ? "webhook-timeout" : "webhook-network-error" };
  } finally {
    clearTimeout(timer);
  }
}
