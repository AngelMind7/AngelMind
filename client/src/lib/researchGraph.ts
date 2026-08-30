export type ResearchTaskNode = {
  id: number;
  title: string;
  status: string;
  dependencies: number[] | string | null | undefined;
};

export type ResearchTaskGraphNode = ResearchTaskNode & {
  depth: number;
  dependencyCount: number;
  unresolvedDependencyCount: number;
  ready: boolean;
};

function parseDependencies(value: ResearchTaskNode["dependencies"]): number[] {
  if (Array.isArray(value)) return value.filter(id => Number.isInteger(id) && id > 0);
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0) : [];
  } catch {
    return [];
  }
}

/**
 * Produces a deterministic, cycle-safe topological layout for a session task graph.
 * The server remains authoritative for transitions; this helper is presentation-only.
 */
export function buildResearchTaskGraph(tasks: ResearchTaskNode[]): ResearchTaskGraphNode[] {
  const byId = new Map(tasks.map(task => [task.id, task]));
  const depthMemo = new Map<number, number>();
  const visiting = new Set<number>();

  const depthOf = (id: number): number => {
    const cached = depthMemo.get(id);
    if (cached !== undefined) return cached;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const task = byId.get(id);
    const dependencies = task ? parseDependencies(task.dependencies).filter(dependencyId => byId.has(dependencyId)) : [];
    const depth = dependencies.length ? Math.max(...dependencies.map(depthOf)) + 1 : 0;
    visiting.delete(id);
    depthMemo.set(id, depth);
    return depth;
  };

  return tasks
    .map(task => {
      const dependencies = parseDependencies(task.dependencies);
      const knownDependencies = dependencies.filter(id => byId.has(id));
      const unresolvedDependencyCount = knownDependencies.filter(id => byId.get(id)?.status !== "completed").length;
      return {
        ...task,
        depth: depthOf(task.id),
        dependencyCount: dependencies.length,
        unresolvedDependencyCount,
        ready: task.status === "queued" && unresolvedDependencyCount === 0,
      };
    })
    .sort((a, b) => a.depth - b.depth || a.id - b.id);
}
