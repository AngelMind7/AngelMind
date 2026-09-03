import { createHash } from "node:crypto";

export type AiResultFinding = {
  key: string;
  conclusion: string;
  confidence: number;
  evidenceReferences: string[];
};

export type AiResultInput = {
  runId: string;
  taskId: string;
  modelId: string;
  input: string;
  findings: AiResultFinding[];
};

export type AiResultProvenance = {
  runId: string;
  taskId: string;
  modelId: string;
  inputHash: string;
  outputHash: string;
};

const MAX_TEXT = 16_384;
const MAX_FINDINGS = 100;
const MAX_REFERENCES = 50;
const MAX_REFERENCE_LENGTH = 512;

function boundedId(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`${field} is required.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > 256) throw new Error(`${field} is invalid.`);
  return normalized;
}

function hash(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeReferences(values: unknown): string[] {
  if (!Array.isArray(values)) throw new Error("Evidence references are invalid.");
  return Array.from(new Set(values.filter((value): value is string => typeof value === "string")
    .map(value => value.trim())
    .filter(Boolean)
    .filter(value => value.length <= MAX_REFERENCE_LENGTH))).slice(0, MAX_REFERENCES);
}

function normalizeFinding(finding: AiResultFinding): AiResultFinding {
  if (!finding || typeof finding !== "object") throw new Error("AI finding is invalid.");
  const key = boundedId(finding.key, "finding key").toLowerCase();
  const conclusion = typeof finding.conclusion === "string" ? finding.conclusion.trim() : "";
  if (!conclusion || conclusion.length > MAX_TEXT) throw new Error("AI finding conclusion is invalid.");
  if (!Number.isFinite(finding.confidence) || finding.confidence < 0 || finding.confidence > 1) throw new Error("AI finding confidence is invalid.");
  return { key, conclusion, confidence: finding.confidence, evidenceReferences: normalizeReferences(finding.evidenceReferences) };
}

export function normalizeAiResult(input: AiResultInput): AiResultInput {
  const runId = boundedId(input?.runId, "runId");
  const taskId = boundedId(input?.taskId, "taskId");
  const modelId = boundedId(input?.modelId, "modelId");
  if (!input || typeof input.input !== "string" || input.input.length > MAX_TEXT) throw new Error("AI input is invalid or too large.");
  if (!Array.isArray(input.findings) || input.findings.length > MAX_FINDINGS) throw new Error("AI findings are invalid or too many.");
  const findings = input.findings.map(normalizeFinding);
  return { runId, taskId, modelId, input: input.input, findings };
}

export function deduplicateFindings(findings: AiResultFinding[]): AiResultFinding[] {
  const normalized = findings.map(normalizeFinding);
  const byKey = new Map<string, AiResultFinding>();
  for (const finding of normalized) {
    const existing = byKey.get(finding.key);
    if (!existing) {
      byKey.set(finding.key, finding);
      continue;
    }
    const evidenceReferences = Array.from(new Set([...existing.evidenceReferences, ...finding.evidenceReferences])).slice(0, MAX_REFERENCES);
    if (finding.confidence > existing.confidence) byKey.set(finding.key, { ...finding, evidenceReferences });
    else byKey.set(finding.key, { ...existing, evidenceReferences });
  }
  return Array.from(byKey.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export function correlateFindings(results: AiResultInput[]) {
  const normalized = results.map(normalizeAiResult);
  const groups = new Map<string, { key: string; conclusions: string[]; taskIds: string[]; evidenceReferences: string[]; confidence: number }>();
  for (const result of normalized) {
    for (const finding of deduplicateFindings(result.findings)) {
      const group = groups.get(finding.key) ?? { key: finding.key, conclusions: [], taskIds: [], evidenceReferences: [], confidence: 0 };
      group.conclusions.push(finding.conclusion);
      group.taskIds.push(result.taskId);
      group.evidenceReferences = Array.from(new Set([...group.evidenceReferences, ...finding.evidenceReferences])).slice(0, MAX_REFERENCES);
      group.confidence = Math.max(group.confidence, finding.confidence);
      groups.set(finding.key, group);
    }
  }
  return Array.from(groups.values()).map(group => ({
    ...group,
    conclusions: Array.from(new Set(group.conclusions)),
    taskIds: Array.from(new Set(group.taskIds)),
    requiresHumanReview: group.conclusions.length > 1 || group.confidence < 0.6,
  })).sort((a, b) => a.key.localeCompare(b.key));
}

export function buildAiResultProvenance(result: AiResultInput): AiResultProvenance {
  const normalized = normalizeAiResult(result);
  const output = JSON.stringify(deduplicateFindings(normalized.findings));
  return {
    runId: normalized.runId,
    taskId: normalized.taskId,
    modelId: normalized.modelId,
    inputHash: hash(normalized.input),
    outputHash: hash(output),
  };
}

export function synthesizeAiResults(results: AiResultInput[]) {
  if (!Array.isArray(results) || results.length === 0 || results.length > 50) throw new Error("AI results are invalid.");
  const normalized = results.map(normalizeAiResult);
  const findings = correlateFindings(normalized);
  return {
    results: normalized.length,
    findings,
    requiresHumanReview: findings.some(finding => finding.requiresHumanReview),
    provenance: normalized.map(buildAiResultProvenance),
  };
}
