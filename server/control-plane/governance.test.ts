import { describe, expect, it } from "vitest";
import { assertDistinctApprover, canReviewApproval, prepareGovernanceRequest } from "./governance";

describe("Tier 3 governance approval gate", () => {
  it("creates a pending governance request while preserving the no-execution invariant", () => {
    const request = prepareGovernanceRequest("privileged_proof");
    expect(request.tier).toBe("tier3");
    expect(request.status).toBe("pending");
    expect(request.executionAuthorized).toBe(false);
  });

  it("does not create an approval queue record for Tier 1 planning", () => {
    const request = prepareGovernanceRequest("coverage_plan");
    expect(request.status).toBe("not-required");
    expect(request.executionAuthorized).toBe(false);
  });

  it("requires a second authenticated identity for a Tier 3 decision", () => {
    expect(() => assertDistinctApprover(11, 11)).toThrow("different authenticated user");
    expect(() => assertDistinctApprover(11, 12)).not.toThrow();
  });

  it("reserves the separate approval queue for a distinct administrator", () => {
    expect(canReviewApproval("user", 11, 12)).toBe(false);
    expect(canReviewApproval("admin", 11, 11)).toBe(false);
    expect(canReviewApproval("admin", 11, 12)).toBe(true);
  });
});
