import { describe, expect, it } from "vitest";
import { simulateGovernedChain } from "./simulation-engine";

describe("simulation API contract", () => {
  it("returns a stable, synthetic result shape for an authenticated request payload", () => {
    const result = simulateGovernedChain({
      workspaceId: 7,
      actorId: 11,
      name: "authorized lab exercise",
      input: { fixture: "training-app" },
      nodes: [{ id: "observe", kind: "action", capability: "observe.passive" }],
    });
    expect(result).toMatchObject({ status: "completed", targetTraffic: false });
    expect(result.simulationId).toMatch(/^sim_[a-f0-9]{24}$/);
    expect(result.evidence[0]).toMatchObject({ provenance: "synthetic" });
  });
});
