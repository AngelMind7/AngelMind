import { describe, expect, it } from "vitest";
import { simulateGovernedChain } from "./simulation-engine";
import { parseNodes } from "./simulation-rest";

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

  it("validates REST node shape before execution", () => {
    expect(parseNodes([
      { id: "discover", kind: "action", capability: "recon.passive" },
      { id: "merge", kind: "merge", capability: "evidence.merge", dependsOn: ["discover"], input: { fixture: "web-app" } },
    ])).toMatchObject([
      { id: "discover", capability: "recon.passive" },
      { id: "merge", dependsOn: ["discover"], input: { fixture: "web-app" } },
    ]);
    expect(() => parseNodes([])).toThrow(/1-128/);
    expect(() => parseNodes([{ id: "one", kind: "action" }])).toThrow(/requires id, kind and capability/);
    expect(() => parseNodes([{ id: "one", kind: "action", capability: "fixture", dependsOn: [1] }])).toThrow(/dependsOn/);
    expect(() => parseNodes([{ id: "one", kind: "action", capability: "fixture", input: [] }])).toThrow(/input/);
  });

  it("enforces the hard node-count ceiling", () => {
    const nodes = Array.from({ length: 129 }, (_, index) => ({ id: `n${index}`, kind: "action", capability: "fixture" }));
    expect(() => parseNodes(nodes)).toThrow(/128/);
  });
});
