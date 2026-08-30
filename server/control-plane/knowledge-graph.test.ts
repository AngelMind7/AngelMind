import { describe, expect, it } from "vitest";
import { findKnowledgePaths, normalizeKnowledgeGraph } from "./knowledge-graph";

describe("knowledge graph utilities", () => {
  it("filters workspace and temporal records while normalizing confidence/provenance", () => {
    const graph = normalizeKnowledgeGraph({
      nodes: [
        { id: "asset:1", type: "asset", label: "example.com", workspaceId: 1, confidence: 120 },
        { id: "asset:2", type: "asset", label: "old", workspaceId: 1, confidence: 20, validUntil: "2020-01-01" },
        { id: "asset:3", type: "asset", label: "other", workspaceId: 2, confidence: 50 },
      ],
      edges: [{ id: "edge:1", from: "asset:1", to: "asset:1", type: "self", workspaceId: 1, confidence: -4, provenance: [" z ", "z", ""] }],
    }, 1, new Date("2025-01-01"));
    expect(graph.nodes.map(node => node.id)).toEqual(["asset:1"]);
    expect(graph.edges[0]).toMatchObject({ confidence: 0, provenance: ["z"] });
  });

  it("returns deterministic cycle-safe paths", () => {
    const graph = { nodes: [], edges: [
      { id: "3", from: "a", to: "c", type: "rel", workspaceId: 1, confidence: 80, provenance: [] },
      { id: "2", from: "b", to: "c", type: "rel", workspaceId: 1, confidence: 80, provenance: [] },
      { id: "1", from: "a", to: "b", type: "rel", workspaceId: 1, confidence: 80, provenance: [] },
      { id: "4", from: "b", to: "a", type: "cycle", workspaceId: 1, confidence: 80, provenance: [] },
    ] };
    expect(findKnowledgePaths(graph, "a", "c", 4)).toEqual([["a", "c"], ["a", "b", "c"]]);
  });
});
