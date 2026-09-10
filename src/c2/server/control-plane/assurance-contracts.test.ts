import { describe, expect, it } from "vitest";
import { buildPolicyDiff, canApplyReviewedChange, canLinkIncidentEvidence, getEscalationDueAt, isWebhookActivationReady } from "./assurance-contracts";

describe("assurance workflow contracts", () => {
  it("requires a distinct reviewer for policy and webhook decisions", () => {
    expect(canApplyReviewedChange(10, 10, true)).toBe(false);
    expect(canApplyReviewedChange(10, 11, false)).toBe(false);
    expect(canApplyReviewedChange(10, 11, true)).toBe(true);
  });
  it("sets severity-dependent escalation deadlines and keeps webhook activation gated", () => {
    const now = Date.now();
    expect(getEscalationDueAt("critical", now).getTime() - now).toBe(30 * 60_000);
    expect(isWebhookActivationReady({ endpointConfirmed: 1, signingSecretReference: "secret://workspace-1/webhook-signing", enabled: 0 })).toBe(true);
    expect(isWebhookActivationReady({ endpointConfirmed: 1, signingSecretReference: null, enabled: 0 })).toBe(false);
  });
  it("persists only controlled policy changes and permits incident evidence only within the responding workspace", () => {
    expect(Object.keys(buildPolicyDiff({ safeHarbor: "a", codeOfConduct: "b", allowlist: ["x"], exclusions: [] }, { safeHarbor: "a", codeOfConduct: "c", allowlist: ["x"], exclusions: ["skip"] }))).toEqual(["codeOfConduct", "exclusions"]);
    expect(canLinkIncidentEvidence(true, 7, 7)).toBe(true);
    expect(canLinkIncidentEvidence(true, 8, 7)).toBe(false);
    expect(canLinkIncidentEvidence(false, 7, 7)).toBe(false);
  });
});
