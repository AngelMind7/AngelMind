import { describe, expect, it } from "vitest";
import { analyzeKnowledgeGraph } from "./knowledge-graph-contract";

describe("knowledge graph analysis contract", () => {
  it("reports orphans and low-confidence edges", () => {
    const result = analyzeKnowledgeGraph([{ id: 1 }, { id: 2 }, { id: 3 }], [{ sourceNodeId: 1, targetNodeId: 2, confidence: 40 }]);
    expect(result).toMatchObject({ nodeCount: 3, edgeCount: 1, orphanNodeIds: [3], lowConfidenceEdges: 1, integrity: true });
  });
  it("detects cycles as a non-integrity state", () => {
    const result = analyzeKnowledgeGraph([{ id: 1 }, { id: 2 }], [{ sourceNodeId: 1, targetNodeId: 2 }, { sourceNodeId: 2, targetNodeId: 1 }]);
    expect(result.cycleNodeIds).toEqual([1, 2]);
    expect(result.integrity).toBe(false);
  });
  it("rejects edges that cross the supplied graph snapshot", () => {
    expect(() => analyzeKnowledgeGraph([{ id: 1 }], [{ sourceNodeId: 1, targetNodeId: 99 }])).toThrow(/unknown nodes/);
  });
});
