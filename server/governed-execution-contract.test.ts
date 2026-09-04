import { describe, expect, it } from "vitest";
import { planCapabilityExecution } from "./execution-orchestrator";
import { canonicalExecutionPath, requiresApproval } from "./execution-state-machine";

describe("governed execution contract", () => {
  it("requires scope before any capability can be planned for execution", () => {
    const plan = planCapabilityExecution({ capability: "sql-injection-testing", mode: "active_nondestructive", scopeValidated: false, humanApproval: true });
    expect(plan).toMatchObject({ disposition: "DENY" });
  });

  it("marks high/critical capabilities for approval unless the planner is given approval", () => {
    expect(planCapabilityExecution({ capability: "ssrf-testing", mode: "active_nondestructive", scopeValidated: true, humanApproval: false })).toMatchObject({ disposition: "REQUIRE_APPROVAL", requiresApproval: true });
    expect(planCapabilityExecution({ capability: "ssrf-testing", mode: "active_nondestructive", scopeValidated: true, humanApproval: true })).toMatchObject({ disposition: "ALLOW", requiresApproval: true });
  });

  it("never treats a missing capability as executable", () => {
    expect(planCapabilityExecution({ capability: "unknown-capability", mode: "passive_readonly", scopeValidated: true, humanApproval: false })).toEqual({ disposition: "DENY", reason: "capability_not_found" });
  });

  it("pins the master 19-state execution path", () => {
    expect(canonicalExecutionPath()).toEqual(["INIT", "RECON", "FINGERPRINT", "VECTOR_SELECTION", "POLICY_CHECK", "APPROVAL_GATE", "QUEUE", "WORKER_EXECUTION", "PARSER", "NORMALIZER", "OBSERVATION", "EVIDENCE", "FINDING", "CORRELATION", "CHAIN_VALIDATION", "IMPACT_PROOF", "REPORT_GENERATION", "SUBMISSION", "DONE"]);
  });

  it("requires approval for high and critical risk", () => {
    expect(requiresApproval("low")).toBe(false);
    expect(requiresApproval("medium")).toBe(false);
    expect(requiresApproval("high")).toBe(true);
    expect(requiresApproval("critical")).toBe(true);
  });
});
