import { createHash } from "node:crypto";
import { invokeLLM } from "../_core/llm";
import { createFinding } from "./service";
import { canAccessWorkspace } from "./operations";
import { selectRegisteredModel } from "../ai-platform";
import { buildMemoryContext } from "../ai-memory";

export type EvidenceAnalysis = {
  summary: string;
  hypotheses: Array<{ title: string; rationale: string; priority: "low" | "medium" | "high" }>;
  confidence: number;
  severity: "informational" | "low" | "medium" | "high" | "critical";
  missingEvidence: string[];
  reportDraft: string;
  safety: { networkCalls: 0; toolsExecuted: 0; autonomousSubmission: false };
};

const schema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    hypotheses: { type: "array", items: { type: "object", properties: { title: { type: "string" }, rationale: { type: "string" }, priority: { type: "string", enum: ["low", "medium", "high"] } }, required: ["title", "rationale", "priority"], additionalProperties: false } },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    severity: { type: "string", enum: ["informational", "low", "medium", "high", "critical"] },
    missingEvidence: { type: "array", items: { type: "string" } },
    reportDraft: { type: "string" },
    safety: { type: "object", properties: { networkCalls: { type: "integer", enum: [0] }, toolsExecuted: { type: "integer", enum: [0] }, autonomousSubmission: { type: "boolean", enum: [false] } }, required: ["networkCalls", "toolsExecuted", "autonomousSubmission"], additionalProperties: false },
  },
  required: ["summary", "hypotheses", "confidence", "severity", "missingEvidence", "reportDraft", "safety"],
  additionalProperties: false,
} as const;

export async function analyzeEvidence(input: { scopeSummary: string; evidence: string; findingTitle?: string; modelKey?: string; memoryContext?: string | null }): Promise<EvidenceAnalysis> {
  if (input.evidence.trim().length < 20) throw new Error("Evidence must contain at least 20 characters.");
  if (input.evidence.length > 40_000 || input.scopeSummary.length > 10_000) throw new Error("Agent input exceeds the safe analysis limit.");
  const modelKey = input.modelKey?.trim() || (await selectRegisteredModel({
    capabilities: ["text"],
    minimumContextWindow: Math.ceil((input.evidence.length + input.scopeSummary.length) / 3),
  })).model.modelKey;
  const messages: Parameters<typeof invokeLLM>[0]["messages"] = [
    { role: "system", content: "You are AngelMind, an evidence analyst for an authorized bug bounty workflow. Analyze only the supplied text. Never contact targets, generate exploit instructions, request credentials, replay tokens, exfiltrate data, or submit reports. Return only JSON matching the schema. Hypotheses must be validation plans using already-provided evidence or a human-reviewed passive check." },
  ];
  if (input.memoryContext) {
    messages.push({ role: "system", content: input.memoryContext });
  }
  messages.push({ role: "user", content: `Scope summary:\n${input.scopeSummary}\n\nFinding title:\n${input.findingTitle ?? "Untitled finding"}\n\nEvidence:\n${input.evidence}` });
  const response = await invokeLLM({
    model: modelKey,
    maxTokens: 2_500,
    messages,
    responseFormat: { type: "json_schema", json_schema: { name: "angelmind_evidence_analysis", strict: true, schema } },
  });
  const content = response.choices[0]?.message.content;
  if (typeof content !== "string") throw new Error("Agent returned no structured analysis.");
  const parsed = JSON.parse(content) as EvidenceAnalysis;
  return { ...parsed, safety: { networkCalls: 0, toolsExecuted: 0, autonomousSubmission: false } };
}

export async function analyzeEvidenceForWorkspace(userId: number, input: { workspaceId: number; scopeSummary: string; evidence: string; findingTitle?: string }): Promise<EvidenceAnalysis> {
  if (!(await canAccessWorkspace(userId, input.workspaceId, "respond"))) throw new Error("Workspace tidak ditemukan atau tidak dapat diakses.");
  const selected = await selectRegisteredModel({ capabilities: ["text"], minimumContextWindow: Math.ceil((input.evidence.length + input.scopeSummary.length) / 3) });
  const memoryContext = await buildMemoryContext(userId, { workspaceId: input.workspaceId });
  return analyzeEvidence({ ...input, modelKey: selected.model.modelKey, memoryContext });
}

export async function analyzeAndCreateFinding(userId: number, input: { workspaceId: number; scopeSummary: string; evidence: string; findingTitle: string }) {
  const analysis = await analyzeEvidenceForWorkspace(userId, input);
  const fingerprint = createHash("sha256").update(`${input.workspaceId}:${input.findingTitle}:${input.evidence}`).digest("hex").slice(0, 64);
  const finding = await createFinding(userId, { workspaceId: input.workspaceId, fingerprint, title: input.findingTitle, impactSummary: analysis.summary, reportDraft: analysis.reportDraft, confidence: analysis.confidence });
  return { ...finding, analysis, fingerprint };
}
