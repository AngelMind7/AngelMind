import { synthesizeAiResults, type AiResultInput } from "./ai-result-pipeline";

export type AgentRole = "scope" | "evidence" | "risk" | "report";

export type OrchestrationTask = {
  id: string;
  role: AgentRole;
  objective: string;
  dependsOn: string[];
  status: "queued" | "blocked";
};

export type AgentObservation = {
  taskId: string;
  role: AgentRole;
  conclusion: string;
  confidence: number;
  evidenceReferences: string[];
};

const roleOrder: AgentRole[] = ["scope", "evidence", "risk", "report"];

export function planMultiAgentRun(input: { objective: string; roles: AgentRole[]; evidenceReferences?: string[] }) {
  if (!input || typeof input.objective !== "string" || !Array.isArray(input.roles) || !input.roles.every(role => roleOrder.includes(role)) || (input.evidenceReferences !== undefined && (!Array.isArray(input.evidenceReferences) || !input.evidenceReferences.every(value => typeof value === "string")))) throw new Error("Orchestration input is invalid.");
  const objective = input.objective.trim();
  if (objective.length < 10) throw new Error("Orchestration objective is required.");
  const roles = Array.from(new Set(input.roles));
  if (roles.length === 0) throw new Error("At least one agent role is required.");
  const ordered = roleOrder.filter(role => roles.includes(role));
  const tasks: OrchestrationTask[] = ordered.map((role, index) => ({
    id: `${role}-${index + 1}`,
    role,
    objective: `${role} analysis: ${objective}`,
    dependsOn: role === "scope" ? [] : ["scope-1"],
    status: role === "scope" ? "queued" : "blocked",
  }));
  return { objective, evidenceReferences: Array.from(new Set((input.evidenceReferences ?? []).map(value => value.trim()).filter(Boolean))), tasks };
}

export function assignReadyTasks(tasks: OrchestrationTask[], capacity: number) {
  if (!Array.isArray(tasks) || !tasks.every(task => task && typeof task.id === "string" && roleOrder.includes(task.role) && Array.isArray(task.dependsOn) && task.dependsOn.every(value => typeof value === "string") && ["queued", "blocked"].includes(task.status))) throw new Error("Orchestration tasks are invalid.");
  const limit = Number.isFinite(capacity) ? Math.max(1, Math.min(50, Math.floor(capacity))) : 1;
  const completed = new Set(tasks.filter(task => task.status === "queued" && task.role === "scope").map(task => task.id));
  return tasks.filter(task => task.status === "queued" || task.dependsOn.every(dependency => completed.has(dependency))).slice(0, limit);
}

export function crossCheckObservations(observations: AgentObservation[]) {
  if (!Array.isArray(observations) || !observations.every(item => item && typeof item.taskId === "string" && roleOrder.includes(item.role) && typeof item.conclusion === "string" && Number.isFinite(item.confidence) && Array.isArray(item.evidenceReferences) && item.evidenceReferences.every(value => typeof value === "string"))) throw new Error("Agent observations are invalid.");
  if (observations.length === 0) return { verdict: "needs_review" as const, agreement: 0, conflicts: ["No agent observations were provided."] };
  const normalized = observations.map(item => item.conclusion.trim().replace(/\s+/g, " ").toLocaleLowerCase()).filter(Boolean);
  const counts = new Map<string, number>();
  for (const conclusion of normalized) counts.set(conclusion, (counts.get(conclusion) ?? 0) + 1);
  const [topConclusion, topCount] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
  const agreement = topCount / observations.length;
  const conflicts = observations.filter(item => item.conclusion.trim().replace(/\s+/g, " ").toLocaleLowerCase() !== topConclusion).map(item => `${item.taskId}: ${item.conclusion.trim()}`);
  return { verdict: agreement >= 0.75 ? "pass" as const : "needs_review" as const, agreement, conflicts };
}

export function synthesizeObservations(observations: AgentObservation[], minimumConfidence = 0.6) {
  if (!Number.isFinite(minimumConfidence)) throw new Error("Minimum confidence is invalid.");
  const crossCheck = crossCheckObservations(observations);
  const threshold = Math.min(1, Math.max(0, minimumConfidence));
  const accepted = observations.filter(item => item.confidence >= threshold && item.conclusion.trim().length > 0);
  const references = Array.from(new Set(accepted.flatMap(item => item.evidenceReferences.map(reference => reference.trim())).filter(Boolean)));
  return {
    acceptedCount: accepted.length,
    conclusion: accepted.length === 0 ? "Insufficient confidence for synthesis." : accepted.map(item => `[${item.role}] ${item.conclusion.trim()}`).join("\n"),
    evidenceReferences: references,
    requiresHumanReview: accepted.length === 0 || crossCheckObservations(accepted).verdict !== "pass" || crossCheck.verdict !== "pass",
  };
}

/**
 * Canonical synthesis boundary for persisted/provider results. The result
 * pipeline owns normalization, deduplication, correlation and provenance;
 * orchestration only exposes that governed boundary to callers.
 */
export function synthesizeOrchestratedAiResults(results: AiResultInput[]) {
  return synthesizeAiResults(results);
}

export function serializeOrchestrationPlan(plan: ReturnType<typeof planMultiAgentRun>) {
  return JSON.stringify(plan);
}
