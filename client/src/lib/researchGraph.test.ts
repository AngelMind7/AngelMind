import { describe, expect, it } from "vitest";
import { buildResearchTaskGraph } from "./researchGraph";

describe("buildResearchTaskGraph", () => {
  it("orders dependencies before dependants and marks ready queued tasks", () => {
    const graph = buildResearchTaskGraph([
      { id: 3, title: "Verify", status: "queued", dependencies: "[2]" },
      { id: 1, title: "Discover", status: "completed", dependencies: "[]" },
      { id: 2, title: "Map", status: "queued", dependencies: [1] },
    ]);

    expect(graph.map(node => node.id)).toEqual([1, 2, 3]);
    expect(graph.find(node => node.id === 2)).toMatchObject({ depth: 1, unresolvedDependencyCount: 0, ready: true });
    expect(graph.find(node => node.id === 3)).toMatchObject({ depth: 2, unresolvedDependencyCount: 1, ready: false });
  });

  it("ignores malformed dependency JSON without breaking the workspace", () => {
    const [node] = buildResearchTaskGraph([{ id: 1, title: "Review", status: "queued", dependencies: "not-json" }]);
    expect(node).toMatchObject({ dependencyCount: 0, unresolvedDependencyCount: 0, ready: true });
  });

  it("does not recurse forever when imported data contains a cycle", () => {
    const graph = buildResearchTaskGraph([
      { id: 1, title: "A", status: "queued", dependencies: [2] },
      { id: 2, title: "B", status: "queued", dependencies: [1] },
    ]);
    expect(graph).toHaveLength(2);
    expect(graph.every(node => Number.isFinite(node.depth))).toBe(true);
  });
});
