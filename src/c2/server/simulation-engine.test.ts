import { describe, expect, it } from "vitest";
import { simulateGovernedChain, validateSimulationGraph } from "./simulation-engine";

describe("simulation engine", () => {
  it("rejects dependency cycles", () => {
    expect(() => validateSimulationGraph([
      { id: "a", kind: "action", capability: "recon", dependsOn: ["b"] },
      { id: "b", kind: "action", capability: "scan", dependsOn: ["a"] },
    ])).toThrow(/cycle/i);
  });

  it("executes a bounded DAG without target traffic", () => {
    const request = {
      workspaceId: 1,
      actorId: 2,
      name: "lab assessment",
      input: { fixture: "web-app" },
      nodes: [
        { id: "enum", kind: "action" as const, capability: "recon.passive" },
        { id: "scan", kind: "parallel" as const, capability: "vuln.scan", dependsOn: ["enum"] },
        { id: "merge", kind: "merge" as const, capability: "evidence.merge", dependsOn: ["scan"] },
      ],
    };
    const first = simulateGovernedChain(request);
    const second = simulateGovernedChain(request);
    expect(first.status).toBe("completed");
    expect(first.targetTraffic).toBe(false);
    expect(first.events).toHaveLength(3);
    expect(first.simulationId).toBe(second.simulationId);
    expect(first.evidence.map(item => item.sha256)).toEqual(second.evidence.map(item => item.sha256));
  });

  it("bounds loop declarations", () => {
    expect(() => validateSimulationGraph([{ id: "loop", kind: "while", capability: "fixture", maxIterations: 101 }])).toThrow(/iteration/i);
  });

  it("rejects oversized graphs and simulation input", () => {
    const nodes = Array.from({ length: 129 }, (_, index) => ({ id: `n${index}`, kind: "action" as const, capability: "fixture" }));
    expect(() => validateSimulationGraph(nodes)).toThrow(/128-node/i);
    expect(() => simulateGovernedChain({ workspaceId: 1, actorId: 2, name: "bounded", input: "x".repeat(128_001), nodes: [{ id: "one", kind: "action", capability: "fixture" }] })).toThrow(/128000-byte/i);
  });

  it("rejects unsafe capability identifiers", () => {
    expect(() => validateSimulationGraph([{ id: "one", kind: "action", capability: "fixture;rm" }])).toThrow(/capability/i);
  });
});
