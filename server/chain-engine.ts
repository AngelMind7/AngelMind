export type ChainNodeType =
  | "module"
  | "action"
  | "condition"
  | "foreach"
  | "while"
  | "parallel"
  | "merge"
  | "sleep"
  | "subchain";

export type ChainNode = {
  id: string;
  type: ChainNodeType;
  dependsOn?: string[];
  maxIterations?: number;
  approvalLevel?: "none" | "admin" | "lead";
};

export type ChainDefinition = {
  nodes: ChainNode[];
};

export function validateChainDefinition(chain: ChainDefinition) {
  const ids = new Set<string>();
  const errors: string[] = [];

  for (const node of chain.nodes) {
    if (!node.id || ids.has(node.id)) errors.push(`duplicate_or_empty_node:${node.id}`);
    ids.add(node.id);
    for (const dependency of node.dependsOn ?? []) {
      if (!chain.nodes.some(candidate => candidate.id === dependency)) {
        errors.push(`missing_dependency:${node.id}->${dependency}`);
      }
    }
    if ((node.type === "foreach" || node.type === "while") && (!node.maxIterations || node.maxIterations < 1 || node.maxIterations > 1000)) {
      errors.push(`bounded_iteration_required:${node.id}`);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const byId = new Map(chain.nodes.map(node => [node.id, node]));
  function visit(id: string) {
    if (visiting.has(id)) return false;
    if (visited.has(id)) return true;
    visiting.add(id);
    const node = byId.get(id);
    for (const dependency of node?.dependsOn ?? []) if (!visit(dependency)) return false;
    visiting.delete(id);
    visited.add(id);
    return true;
  }
  for (const node of chain.nodes) if (!visit(node.id)) errors.push(`cycle_detected:${node.id}`);

  return { valid: errors.length === 0, errors };
}

export function planChainExecution(chain: ChainDefinition) {
  const validation = validateChainDefinition(chain);
  if (!validation.valid) throw new Error(`Invalid chain: ${validation.errors.join(",")}`);

  const remaining = new Map(chain.nodes.map(node => [node.id, node]));
  const completed = new Set<string>();
  const waves: ChainNode[][] = [];

  while (remaining.size) {
    const ready = [...remaining.values()].filter(node => (node.dependsOn ?? []).every(id => completed.has(id)));
    if (!ready.length) throw new Error("Unable to produce a chain execution plan.");
    waves.push(ready);
    for (const node of ready) {
      remaining.delete(node.id);
      completed.add(node.id);
    }
  }

  return waves;
}
