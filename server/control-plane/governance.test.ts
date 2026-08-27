import { describe, expect, it } from "vitest";
import { prepareGovernanceRequest } from "./governance";

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
});
