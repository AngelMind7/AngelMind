export type KnowledgeNode = { id: string; type: string; label: string; workspaceId: number; confidence: number; validFrom?: string; validUntil?: string };
export type KnowledgeEdge = { id: string; from: string; to: string; type: string; workspaceId: number; confidence: number; provenance: string[]; validFrom?: string; validUntil?: string };
export type KnowledgeGraph = { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] };

function activeAt(validFrom: string | undefined, validUntil: string | undefined, at: Date) {
  const from = validFrom ? Date.parse(validFrom) : Number.NEGATIVE_INFINITY;
  const until = validUntil ? Date.parse(validUntil) : Number.POSITIVE_INFINITY;
  return Number.isFinite(from) && from > at.getTime() ? false : until >= at.getTime();
}

export function normalizeKnowledgeGraph(graph: KnowledgeGraph, workspaceId: number, at = new Date()): KnowledgeGraph {
  const nodes = graph.nodes.filter(node => node.workspaceId === workspaceId && node.id.trim() && activeAt(node.validFrom, node.validUntil, at)).map(node => ({ ...node, confidence: Math.max(0, Math.min(100, node.confidence)) })).sort((a, b) => a.id.localeCompare(b.id));
  const nodeIds = new Set(nodes.map(node => node.id));
  const edges = graph.edges.filter(edge => edge.workspaceId === workspaceId && nodeIds.has(edge.from) && nodeIds.has(edge.to) && activeAt(edge.validFrom, edge.validUntil, at)).map(edge => ({ ...edge, confidence: Math.max(0, Math.min(100, edge.confidence)), provenance: Array.from(new Set(edge.provenance.map(value => value.trim()).filter(Boolean))).sort() })).sort((a, b) => a.id.localeCompare(b.id));
  return { nodes, edges };
}

export function findKnowledgePaths(graph: KnowledgeGraph, from: string, to: string, maxDepth = 5): string[][] {
  if (from === to) return [[from]];
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), edge.to].sort());
  const paths: string[][] = [];
  const visit = (current: string, path: string[]) => {
    if (path.length - 1 >= maxDepth) return;
    for (const next of adjacency.get(current) ?? []) {
      if (path.includes(next)) continue;
      const nextPath = [...path, next];
      if (next === to) paths.push(nextPath); else visit(next, nextPath);
    }
  };
  visit(from, [from]);
  return paths.sort((a, b) => a.length - b.length || a.join("/").localeCompare(b.join("/")));
}
