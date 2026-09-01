import { describe, expect, it } from "vitest";
import { buildRedactedNotificationPayload, notificationProviders } from "./notification-delivery";

describe("notification delivery provider contract", () => {
  it("redacts secret-like values from durable payloads", () => {
    const payload = JSON.parse(buildRedactedNotificationPayload({ eventType: "incident_created", severity: "critical", title: "Token: abc", message: "password=secret-value", workspaceId: 7 }));
    expect(payload.title).toContain("[REDACTED]");
    expect(payload.message).toContain("[REDACTED]");
    expect(payload.workspaceId).toBe(7);
  });

  it("keeps in-app delivery enabled and external providers fail closed by default", () => {
    expect(notificationProviders.in_app.isEnabled()).toBe(true);
    expect(notificationProviders.webhook.isEnabled()).toBe(false);
  });
});
