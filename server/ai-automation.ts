import { randomUUID } from "node:crypto";
import { getAiEvaluationSummary, listModels, selectRegisteredModel, startAiRun, updateAiRun } from "./ai-platform";

export type WorkerRole = "research" | "analysis" | "triage" | "report";
export type AutomationMode = "simulation" | "governed";

export type AiWorker = {
  id: string;
  workspaceId: number;
  name: string;
  role: WorkerRole;
  modelKey: string;
  budgetCents: number;
  timeoutSeconds: number;
  mode: AutomationMode;
  enabled: boolean;
  createdAt: string;
};

export type PromptVersion = { id: string; name: string; version: number; template: string; active: boolean; createdAt: string };

const workers = new Map<string, AiWorker>();
const prompts = new Map<string, PromptVersion>();

function boundedInt(value: number, min: number, max: number) { return Math.min(max, Math.max(min, Math.floor(value))); }

export function createAiWorker(input: Omit<AiWorker, "id" | "createdAt" | "mode" | "enabled"> & { mode?: AutomationMode }) {
  if (!Number.isInteger(input.workspaceId) || input.workspaceId < 1) throw new Error("Workspace is required.");
  if (!input.name.trim() || !["research", "analysis", "triage", "report"].includes(input.role)) throw new Error("Worker name and role are required.");
  if (!input.modelKey.trim() || input.budgetCents < 0) throw new Error("Worker model and budget are required.");
  const worker: AiWorker = { id: `aiw_${randomUUID()}`, workspaceId: input.workspaceId, name: input.name.trim(), role: input.role, modelKey: input.modelKey.trim(), budgetCents: boundedInt(input.budgetCents, 0, 100_000_000), timeoutSeconds: boundedInt(input.timeoutSeconds, 1, 3_600), mode: input.mode ?? "simulation", enabled: true, createdAt: new Date().toISOString() };
  workers.set(worker.id, worker);
  return worker;
}

export function listAiWorkers(workspaceId: number) { return Array.from(workers.values()).filter(worker => worker.workspaceId === workspaceId); }

export function setAiWorkerEnabled(workerId: string, enabled: boolean) {
  const worker = workers.get(workerId);
  if (!worker) throw new Error("AI worker not found.");
  worker.enabled = Boolean(enabled);
  return worker;
}

export function registerPrompt(input: { name: string; template: string }) {
  const name = input.name.trim();
  const template = input.template.trim();
  if (name.length < 2 || template.length < 2) throw new Error("Prompt name and template are required.");
  const versions = Array.from(prompts.values()).filter(prompt => prompt.name === name);
  const prompt: PromptVersion = { id: `prm_${randomUUID()}`, name, version: versions.length + 1, template, active: true, createdAt: new Date().toISOString() };
  for (const existing of versions) existing.active = false;
  prompts.set(prompt.id, prompt);
  return prompt;
}

export function listPrompts(name?: string) { return Array.from(prompts.values()).filter(prompt => !name || prompt.name === name).sort((a, b) => a.name.localeCompare(b.name) || b.version - a.version); }

export async function getAutomationCatalog() {
  return { providers: await listModels(), workers: Array.from(workers.values()), prompts: listPrompts(), modes: ["simulation", "governed" as const], externalImpact: "approval-and-audit-required" as const };
}

export async function routeAutomation(input: { capabilities?: string[]; minimumContextWindow?: number; maxCostCentsPerMillionTokens?: number }) {
  return selectRegisteredModel({ ...input, allowDegraded: false });
}

export async function runAiWorker(input: { userId: number; workerId: string; purpose: string; inputReference: string; estimatedCostCents?: number }) {
  const worker = workers.get(input.workerId);
  if (!worker || !worker.enabled) throw new Error("AI worker is missing or disabled.");
  if (input.estimatedCostCents !== undefined && input.estimatedCostCents > worker.budgetCents) throw new Error("AI worker budget exceeded.");
  // All worker execution is routed through the existing workspace/budget/audit boundary.
  const run = await startAiRun(input.userId, { workspaceId: worker.workspaceId, modelKey: worker.modelKey, gateway: "registered", purpose: input.purpose, inputReference: input.inputReference, estimatedCostCents: input.estimatedCostCents ?? 0 });
  if (worker.mode === "simulation") {
    return updateAiRun(input.userId, { runId: run.id, status: "completed", outputReference: `simulation://ai-worker/${worker.id}/${run.traceId}`, inputTokens: 0, outputTokens: 0, costCents: input.estimatedCostCents ?? 0 });
  }
  // Governed mode creates a queued run only; provider-side execution requires the normal approval/audit pipeline.
  return run;
}

export async function getAiAutomationQuality(userId: number, workspaceId: number) { return getAiEvaluationSummary(userId, workspaceId); }
