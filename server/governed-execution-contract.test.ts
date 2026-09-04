import { describe, expect, it } from "vitest";
import { planCapabilityExecution } from "./execution-orchestrator";

describe("governed execution contract", () => {
  it("requires scope before any capability can be planned for execution", () => {
    const plan = planCapabilityExecution({
      capability: "sql-injection-testing",
      mode: "active_nondestructive",
      scopeValidated: false,
      humanApproval: true,
    });
    expect(plan).toMatchObject({ disposition: "DENY" });
  });

  it("marks high/critical capabilities for approval unless the planner is given approval", () => {
    expect(planCapabilityExecution({
      capability: "ssrf-testing",
      mode: "active_nondestructive",
      scopeValidated: true,
      humanApproval: false,
    })).toMatchObject({ disposition: "REQUIRE_APPROVAL", requiresApproval: true });

    expect(planCapabilityExecution({
      capability: "ssrf-testing",
      mode: "active_nondestructive",
      scopeValidated: true,
      humanApproval: true,
    })).toMatchObject({ disposition: "ALLOW", requiresApproval: true });
  });

  it("never treats a missing capability as executable", () => {
    expect(planCapabilityExecution({
      capability: "unknown-capability",
      mode: "passive_readonly",
      scopeValidated: true,
      humanApproval: false,
    })).toEqual({ disposition: "DENY", reason: "capability_not_found" });
  });
});
