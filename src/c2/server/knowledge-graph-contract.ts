export type GraphNode = { id: number; status?: string };
export type GraphEdge = { sourceNodeId: number; targetNodeId: number; confidence?: number };

export function analyzeKnowledgeGraph(nodes: GraphNode[], edges: GraphEdge[]) {
  const ids = new Set(nodes.map(node => node.id));
  const invalidEdges = edges.filter(edge => !ids.has(edge.sourceNodeId) || !ids.has(edge.targetNodeId));
  if (invalidEdges.length) throw new Error("Graph contains edges pointing to unknown nodes.");
  const incoming = new Set(edges.map(edge => edge.targetNodeId));
  const outgoing = new Set(edges.map(edge => edge.sourceNodeId));
  const orphanNodeIds = nodes.filter(node => !incoming.has(node.id) && !outgoing.has(node.id)).map(node => node.id);
  const adjacency = new Map<number, number[]>();
  for (const edge of edges) adjacency.set(edge.sourceNodeId, [...(adjacency.get(edge.sourceNodeId) ?? []), edge.targetNodeId]);
  const visiting = new Set<number>();
  const visited = new Set<number>();
  const cycleNodes = new Set<number>();
  const walk = (id: number) => {
    if (visiting.has(id)) { cycleNodes.add(id); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const next of adjacency.get(id) ?? []) { walk(next); if (cycleNodes.has(next)) cycleNodes.add(id); }
    visiting.delete(id); visited.add(id);
  };
  for (const node of nodes) walk(node.id);
  const lowConfidenceEdges = edges.filter(edge => (edge.confidence ?? 100) < 60).length;
  return { nodeCount: nodes.length, edgeCount: edges.length, orphanNodeIds, cycleNodeIds: [...cycleNodes].sort((a, b) => a - b), lowConfidenceEdges, integrity: invalidEdges.length === 0 && cycleNodes.size === 0 };
}
