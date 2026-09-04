import { describe, expect, it } from "vitest";
import { planCapabilityExecution, shouldUseFallback } from "./execution-orchestrator";

describe("execution orchestrator", () => {
  it("resolves a master capability to its primary adapter and fallback", () => {
    const plan = planCapabilityExecution({
      capability: "sql-injection-testing",
      mode: "active_nondestructive",
      scopeValidated: true,
      humanApproval: false,
    });

    expect(plan).toMatchObject({
      capability: "sql-injection-testing",
      toolKey: "sqlmap",
      fallbackToolKey: "burp_suite_pro",
      riskClass: "critical",
      disposition: "REQUIRE_APPROVAL",
      requiresApproval: true,
    });
  });

  it("fails closed when scope has not been validated", () => {
    expect(
      planCapabilityExecution({
        capability: "dns-enumeration",
        mode: "passive_readonly",
        scopeValidated: false,
        humanApproval: true,
      })
    ).toMatchObject({ disposition: "DENY" });
  });

  it("allows approved high-risk execution planning", () => {
    expect(
      planCapabilityExecution({
        capability: "ssrf-testing",
        mode: "active_nondestructive",
        scopeValidated: true,
        humanApproval: true,
      })
    ).toMatchObject({ disposition: "ALLOW", requiresApproval: true });
  });

  it("only selects a fallback when the primary is unavailable and fallback is available", () => {
    const plan = planCapabilityExecution({
      capability: "parameter-manipulation",
      mode: "passive_readonly",
      scopeValidated: true,
      humanApproval: false,
    });

    expect(plan).toHaveProperty("toolKey", "ffuf");
    if ("toolKey" in plan) {
      expect(shouldUseFallback(plan, false, true)).toBe(true);
      expect(shouldUseFallback(plan, true, true)).toBe(false);
      expect(shouldUseFallback(plan, false, false)).toBe(false);
    }
  });
});
