import { describe, expect, it } from "vitest";
import {
  assertRuntimePolicy,
  isTargetExecutionMode,
  requiresHumanApproval,
  runtimePackForRequest,
} from "./tool-runtime-policy";

describe("tool runtime policy", () => {
  it("routes passive execution to the passive pack", () => {
    expect(runtimePackForRequest("passive_readonly", "low")).toBe("passive-pack");
    expect(runtimePackForRequest("passive_readonly", "high")).toBe("passive-pack");
  });

  it("routes high-risk and privileged execution to the review-required pack", () => {
    expect(runtimePackForRequest("active_nondestructive", "high")).toBe("review-required-pack");
    expect(runtimePackForRequest("active_nondestructive", "critical")).toBe("review-required-pack");
    expect(runtimePackForRequest("privileged_or_destructive", "critical")).toBe("review-required-pack");
  });

  it("requires approval for high and critical risk", () => {
    expect(requiresHumanApproval("passive_readonly", "high")).toBe(true);
    expect(requiresHumanApproval("active_nondestructive", "critical")).toBe(true);
    expect(requiresHumanApproval("passive_readonly", "low")).toBe(false);
  });

  it("fails closed before target execution when scope or deployment approval is missing", () => {
    expect(isTargetExecutionMode("active_nondestructive")).toBe(true);
    expect(isTargetExecutionMode("privileged_or_destructive")).toBe(true);
    expect(isTargetExecutionMode("passive_readonly")).toBe(false);

    expect(
      assertRuntimePolicy({
        mode: "active_nondestructive",
        riskClass: "medium",
        scopeValidated: false,
        humanApproval: true,
        targetExecutionEnabled: true,
      })
    ).toEqual({ allowed: false, reason: "scope_not_validated" });

    expect(
      assertRuntimePolicy({
        mode: "active_nondestructive",
        riskClass: "medium",
        scopeValidated: true,
        humanApproval: true,
        targetExecutionEnabled: false,
      })
    ).toEqual({ allowed: false, reason: "target_execution_disabled" });
  });

  it("does not allow privileged mode for non-critical tools", () => {
    expect(
      assertRuntimePolicy({
        mode: "privileged_or_destructive",
        riskClass: "high",
        scopeValidated: true,
        humanApproval: true,
        targetExecutionEnabled: true,
      })
    ).toEqual({ allowed: false, reason: "privileged_mode_blocked" });
  });

  it("returns the review pack only after all gates pass", () => {
    expect(
      assertRuntimePolicy({
        mode: "privileged_or_destructive",
        riskClass: "critical",
        scopeValidated: true,
        humanApproval: true,
        targetExecutionEnabled: true,
      })
    ).toEqual({ allowed: true, runtimePack: "review-required-pack" });
  });
});
