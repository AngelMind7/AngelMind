import { describe, expect, it } from "vitest";
import { applyPolicyDecisionWorkflow, applyWebhookReviewWorkflow, preparePolicyVersionWorkflow, prepareWebhookActivationWorkflow, shouldEscalateIncident, transitionIncidentWorkflow } from "./assurance-workflows";

const original = { safeHarbor: "safe", codeOfConduct: "conduct", allowlist: ["app.example"], exclusions: [] };

describe("assurance service workflow seams", () => {
  it("creates a pending policy record with a structured diff and applies only distinct-reviewer approvals", () => {
    const pending = preparePolicyVersionWorkflow(original, { ...original, exclusions: ["admin.example"] }, 3, 42, "Add an exclusion");
    expect(pending).toMatchObject({ version: 4, status: "pending", requestedByUserId: 42 });
    expect(pending.diff).toHaveProperty("exclusions");
    expect(applyPolicyDecisionWorkflow("pending", 42, 43, true, "approved")).toEqual({ status: "approved", activePolicyUpdated: true });
    expect(() => applyPolicyDecisionWorkflow("pending", 42, 42, true, "approved")).toThrow();
  });
  it("enforces incident lifecycle transitions and escalates each overdue unresolved incident once", () => {
    expect(transitionIncidentWorkflow("open", "acknowledge")).toBe("acknowledged");
    expect(transitionIncidentWorkflow("acknowledged", "resolve")).toBe("resolved");
    const now = new Date("2026-08-27T15:00:00Z");
    expect(shouldEscalateIncident("open", new Date("2026-08-27T14:59:00Z"), null, now)).toBe(true);
    expect(shouldEscalateIncident("resolved", new Date("2026-08-27T14:59:00Z"), null, now)).toBe(false);
    expect(shouldEscalateIncident("open", new Date("2026-08-27T14:59:00Z"), new Date(), now)).toBe(false);
  });
  it("keeps webhook delivery disabled through request and distinct-reviewer decision", () => {
    expect(prepareWebhookActivationWorkflow(true, false, 42)).toEqual({ status: "pending", requestedByUserId: 42, outboundDeliveryEnabled: false });
    expect(applyWebhookReviewWorkflow("pending", 42, 43, true, "approved")).toEqual({ status: "approved", outboundDeliveryEnabled: false });
    expect(() => prepareWebhookActivationWorkflow(false, false, 42)).toThrow();
    expect(() => applyWebhookReviewWorkflow("pending", 42, 42, true, "approved")).toThrow();
  });
});
