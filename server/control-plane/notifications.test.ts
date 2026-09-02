import { describe, expect, it } from "vitest";
import { canAcknowledgeNotification, isInAppEnabled, planInAppDelivery } from "./notifications";

describe("in-app notification preferences", () => {
  it("defaults every event to enabled until an explicit user preference disables it", () => {
    expect(isInAppEnabled("approval_required", [])).toBe(true);
    expect(isInAppEnabled("approval_required", [{ eventType: "approval_required", inAppEnabled: 0 }])).toBe(false);
  });

  it("creates a delivery and audit plan that mirrors the preference decision", () => {
    expect(planInAppDelivery("finding_validated", [])).toEqual({ delivered: true, auditSubject: "in-app-delivered" });
    expect(planInAppDelivery("finding_validated", [{ eventType: "finding_validated", inAppEnabled: 0 }])).toEqual({ delivered: false, auditSubject: "in-app-suppressed" });
  });

  it("only lets the notification recipient acknowledge an alert", () => {
    expect(canAcknowledgeNotification(101, 101)).toBe(true);
    expect(canAcknowledgeNotification(101, 202)).toBe(false);
    expect(canAcknowledgeNotification(0, 0)).toBe(false);
    expect(canAcknowledgeNotification(Number.NaN, Number.NaN)).toBe(false);
  });
});
