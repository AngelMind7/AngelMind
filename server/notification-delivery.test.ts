import { describe, expect, it } from "vitest";
import { buildRedactedNotificationPayload, getNotificationRetryDelayMs, notificationProviders } from "./notification-delivery";

describe("notification delivery provider contract", () => {
  it("redacts secret-like values from durable payloads", () => {
    const payload = JSON.parse(buildRedactedNotificationPayload({ eventType: "incident_created", severity: "critical", title: "Token: abc", message: "password=secret-value", workspaceId: 7 }));
    expect(payload.title).toContain("[REDACTED]");
    expect(payload.message).toContain("[REDACTED]");
    expect(payload.workspaceId).toBe(7);
  });

  it("uses bounded exponential backoff for provider retry", () => {
    expect(getNotificationRetryDelayMs(0)).toBe(5_000);
    expect(getNotificationRetryDelayMs(3)).toBe(40_000);
    expect(getNotificationRetryDelayMs(99)).toBe(3_600_000);
    expect(getNotificationRetryDelayMs(-2)).toBe(5_000);
  });

  it("keeps in-app delivery enabled and external providers fail closed by default", () => {
    expect(notificationProviders.in_app.isEnabled()).toBe(true);
    expect(notificationProviders.webhook.isEnabled()).toBe(false);
  });
});
