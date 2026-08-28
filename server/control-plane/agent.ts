import { invokeLLM } from "../_core/llm";

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

export async function analyzeEvidence(input: { scopeSummary: string; evidence: string; findingTitle?: string }): Promise<EvidenceAnalysis> {
  if (input.evidence.trim().length < 20) throw new Error("Evidence must contain at least 20 characters.");
  if (input.evidence.length > 40_000 || input.scopeSummary.length > 10_000) throw new Error("Agent input exceeds the safe analysis limit.");
  const response = await invokeLLM({
    model: "gpt-5-mini",
    maxTokens: 2_500,
    messages: [
      { role: "system", content: "You are AngelMind, an evidence analyst for an authorized bug bounty workflow. Analyze only the supplied text. Never contact targets, generate exploit instructions, request credentials, replay tokens, exfiltrate data, or submit reports. Return only JSON matching the schema. Hypotheses must be validation plans using already-provided evidence or a human-reviewed passive check." },
      { role: "user", content: `Scope summary:\n${input.scopeSummary}\n\nFinding title:\n${input.findingTitle ?? "Untitled finding"}\n\nEvidence:\n${input.evidence}` },
    ],
    responseFormat: { type: "json_schema", json_schema: { name: "angelmind_evidence_analysis", strict: true, schema } },
  });
  const content = response.choices[0]?.message.content;
  if (typeof content !== "string") throw new Error("Agent returned no structured analysis.");
  const parsed = JSON.parse(content) as EvidenceAnalysis;
  return { ...parsed, safety: { networkCalls: 0, toolsExecuted: 0, autonomousSubmission: false } };
}
