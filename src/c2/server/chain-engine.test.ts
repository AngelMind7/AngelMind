import { describe, expect, it } from "vitest";
import { planChainExecution, validateChainDefinition } from "./chain-engine";

describe("governed DAG chain planner", () => {
  it("supports parallel-ready waves and dependencies", () => {
    const chain = {
      nodes: [
        { id: "enum", type: "module" as const },
        { id: "tech", type: "module" as const, dependsOn: ["enum"] },
        { id: "ports", type: "module" as const, dependsOn: ["enum"] },
        { id: "merge", type: "merge" as const, dependsOn: ["tech", "ports"] },
      ],
    };
    const waves = planChainExecution(chain);
    expect(waves.map(wave => wave.map(node => node.id))).toEqual([
      ["enum"],
      ["tech", "ports"],
      ["merge"],
    ]);
  });

  it("requires bounded foreach/while loops and rejects cycles", () => {
    expect(validateChainDefinition({
      nodes: [{ id: "loop", type: "while", maxIterations: 3 }],
    }).valid).toBe(true);
    expect(validateChainDefinition({
      nodes: [{ id: "loop", type: "while" }],
    }).valid).toBe(false);
    expect(validateChainDefinition({
      nodes: [
        { id: "a", type: "action", dependsOn: ["b"] },
        { id: "b", type: "action", dependsOn: ["a"] },
      ],
    }).valid).toBe(false);
  });
});
