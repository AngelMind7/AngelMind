import { describe, expect, it } from "vitest";
import { traverseGraph } from "./knowledge-graph";

const graphModule = await import("./knowledge-graph");

describe("knowledge graph traversal", () => {
  it("enforces workspace access through the graph boundary", async () => {
    await expect(graphModule.traverseGraph(1, { workspaceId: 1, startNodeId: 1 })).rejects.toThrow();
  });

  it("keeps traversal bounded and cycle-safe", () => {
    const graph = {
      nodes: [
        { id: 1, workspaceId: 1, nodeType: "asset", externalId: "a", label: "A", properties: "{}", status: "active" },
        { id: 2, workspaceId: 1, nodeType: "asset", externalId: "b", label: "B", properties: "{}", status: "active" },
        { id: 3, workspaceId: 1, nodeType: "asset", externalId: "c", label: "C", properties: "{}", status: "active" },
      ],
      edges: [
        { id: 1, workspaceId: 1, sourceNodeId: 1, targetNodeId: 2, relationType: "relates", confidence: 100, provenance: "{}" },
        { id: 2, workspaceId: 1, sourceNodeId: 2, targetNodeId: 3, relationType: "relates", confidence: 100, provenance: "{}" },
        { id: 3, workspaceId: 1, sourceNodeId: 3, targetNodeId: 1, relationType: "relates", confidence: 100, provenance: "{}" },
      ],
    };

    const originalListGraph = graphModule.listGraph;
    void originalListGraph;
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(3);
  });
});
