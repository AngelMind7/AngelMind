import { describe, expect, it } from "vitest";
import { advanceExecution, canonicalExecutionPath } from "./execution-state-machine";

describe("durable execution ledger contract", () => {
  it("uses the canonical 19-state path without gaps", () => {
    const path = canonicalExecutionPath();
    expect(path).toHaveLength(19);
    expect(path[0]).toBe("INIT");
    expect(path.at(-1)).toBe("DONE");
    expect(new Set(path).size).toBe(path.length);
  });

  it("requires scope validation before leaving policy check", () => {
    const blocked = advanceExecution({ state: "POLICY_CHECK", risk: "low", scopeValidated: false, approval: "not_required" });
    expect(blocked.state).toBe("POLICY_CHECK");

    const allowed = advanceExecution({ state: "POLICY_CHECK", risk: "low", scopeValidated: true, approval: "not_required" });
    expect(allowed.state).toBe("APPROVAL_GATE");
  });

  it("keeps high-risk execution waiting for human approval", () => {
    const pending = advanceExecution({ state: "APPROVAL_GATE", risk: "high", scopeValidated: true, approval: "pending" });
    expect(pending.state).toBe("APPROVAL_GATE");

    const approved = advanceExecution({ state: "APPROVAL_GATE", risk: "high", scopeValidated: true, approval: "approved" });
    expect(approved.state).toBe("QUEUE");
  });
});
