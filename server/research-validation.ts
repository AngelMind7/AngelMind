export type ResearchTaskDefinition = {
  taskId?: number;
  type: string;
  title: string;
  priority: number;
  dependencies: number[];
};

const MAX_TASK_TYPE_LENGTH = 80;
const MAX_TASK_TITLE_LENGTH = 240;
const MAX_HYPOTHESIS_DESCRIPTION_LENGTH = 2_000;
const MAX_HYPOTHESIS_REASON_LENGTH = 4_000;

export function validateResearchTaskDefinition(input: ResearchTaskDefinition) {
  if (!input || typeof input.type !== "string" || typeof input.title !== "string") {
    throw new Error("Research task type and title are required.");
  }
  const type = input.type.trim();
  const title = input.title.trim();
  if (type.length < 2 || type.length > MAX_TASK_TYPE_LENGTH) throw new Error("Research task type is invalid.");
  if (title.length < 3 || title.length > MAX_TASK_TITLE_LENGTH) throw new Error("Research task title is invalid.");
  if (!Number.isInteger(input.priority) || input.priority < 0 || input.priority > 100) throw new Error("Research task priority must be an integer from 0 to 100.");
  if (!Array.isArray(input.dependencies) || input.dependencies.some(id => !Number.isInteger(id) || id < 1)) throw new Error("Task dependencies must use positive integer IDs.");
  const dependencies = Array.from(new Set(input.dependencies));
  if (input.taskId !== undefined && dependencies.includes(input.taskId)) throw new Error("A research task cannot depend on itself.");
  return { type, title, priority: input.priority, dependencies };
}

export function validateResearchHypothesisInput(input: { description: string; reason: string; priority: number }) {
  if (!input || typeof input.description !== "string" || typeof input.reason !== "string") throw new Error("Hypothesis description and reason are required.");
  const description = input.description.trim();
  const reason = input.reason.trim();
  if (description.length < 3 || description.length > MAX_HYPOTHESIS_DESCRIPTION_LENGTH) throw new Error("Hypothesis description is invalid.");
  if (reason.length < 3 || reason.length > MAX_HYPOTHESIS_REASON_LENGTH) throw new Error("Hypothesis reason is invalid.");
  if (!Number.isInteger(input.priority) || input.priority < 0 || input.priority > 100) throw new Error("Hypothesis priority must be an integer from 0 to 100.");
  return { description, reason, priority: input.priority };
}

export function assertDependencyGraphAcyclic(edges: Array<{ taskId: number; dependsOnTaskId: number }>) {
  const graph = new Map<number, number[]>();
  for (const edge of edges) {
    if (!Number.isInteger(edge.taskId) || !Number.isInteger(edge.dependsOnTaskId) || edge.taskId < 1 || edge.dependsOnTaskId < 1) throw new Error("Dependency graph IDs must be positive integers.");
    graph.set(edge.taskId, [...(graph.get(edge.taskId) ?? []), edge.dependsOnTaskId]);
  }
  const visiting = new Set<number>();
  const visited = new Set<number>();
  const visit = (taskId: number): void => {
    if (visiting.has(taskId)) throw new Error("Research task dependency graph contains a cycle.");
    if (visited.has(taskId)) return;
    visiting.add(taskId);
    for (const dependency of graph.get(taskId) ?? []) visit(dependency);
    visiting.delete(taskId);
    visited.add(taskId);
  };
  for (const taskId of graph.keys()) visit(taskId);
}

