import { describe, expect, it } from "vitest";
import {
  advanceExecution,
  canonicalExecutionPath,
  transitionExecution,
} from "./execution-state-machine";

describe("canonical execution state machine", () => {
  it("matches the master execution path", () => {
    expect(canonicalExecutionPath()).toEqual([
      "INIT",
      "RECON",
      "FINGERPRINT",
      "VECTOR_SELECTION",
      "POLICY_CHECK",
      "APPROVAL_GATE",
      "QUEUE",
      "WORKER_EXECUTION",
      "PARSER",
      "NORMALIZER",
      "OBSERVATION",
      "EVIDENCE",
      "FINDING",
      "CORRELATION",
      "CHAIN_VALIDATION",
      "IMPACT_PROOF",
      "REPORT_GENERATION",
      "SUBMISSION",
      "DONE",
    ]);
  });

  it("fails closed when scope is not validated", () => {
    const result = transitionExecution({
      state: "POLICY_CHECK",
      risk: "low",
      scopeValidated: false,
      approval: "not_required",
    });
    expect(result).toEqual({
      allowed: false,
      reason: "scope_validation_required",
    });
  });

  it("stops high-risk execution at the approval gate", () => {
    const result = transitionExecution({
      state: "APPROVAL_GATE",
      risk: "high",
      scopeValidated: true,
      approval: "pending",
    });
    expect(result).toEqual({
      allowed: false,
      reason: "awaiting_human_approval",
    });
  });

  it("continues high-risk execution only after approval", () => {
    const context = {
      state: "APPROVAL_GATE" as const,
      risk: "critical" as const,
      scopeValidated: true,
      approval: "approved" as const,
    };
    expect(advanceExecution(context).state).toBe("QUEUE");
  });
});
