import { describe, expect, it } from "vitest";
import { validateEgressPolicy, type EgressPolicy } from "./egress-policy";
import { planMobileAnalysis } from "./mobile-analysis";

const baseEgress: EgressPolicy = {
  mode: "static",
  provider: "socks5",
  rotation: "per_target",
  fallback: "abort",
  allowedTargetsOnly: true,
  blockInternalRanges: true,
};

describe("V4 gap contracts", () => {
  it("requires target-only egress and internal range blocking", () => {
    expect(validateEgressPolicy(baseEgress).allowed).toBe(true);
    expect(validateEgressPolicy({ ...baseEgress, blockInternalRanges: false }).reason).toBe("internal_ranges_must_be_blocked");
  });

  it("plans APK static analysis without device execution", () => {
    const plan = planMobileAnalysis({ tier: "static", artifactType: "apk", artifactName: "sample.apk" });
    expect(plan.accepted).toBe(true);
    expect(plan.queueRequired).toBe(false);
    expect(plan.constraints).toContain("no_device_execution");
  });

  it("requires a dedicated queue for Android dynamic analysis", () => {
    const plan = planMobileAnalysis({ tier: "android_dynamic_queue", artifactType: "apk", artifactName: "sample.apk" });
    expect(plan.accepted).toBe(true);
    expect(plan.queueRequired).toBe(true);
    expect(plan.constraints).toContain("authorized-lab-only");
  });
});
