import { describe, expect, it } from "vitest";
import { buildAiResultProvenance, correlateFindings, deduplicateFindings, normalizeAiResult, synthesizeAiResults } from "./ai-result-pipeline";

describe("AI result pipeline", () => {
  const result = { runId: "run-1", taskId: "task-1", modelId: "model-1", input: "objective", findings: [
    { key: "risk-a", conclusion: "Potential issue", confidence: 0.8, evidenceReferences: [" evidence/1 ", "evidence/1"] },
    { key: "risk-a", conclusion: "Potential issue", confidence: 0.7, evidenceReferences: ["evidence/2"] },
  ] };

  it("normalizes and deduplicates findings deterministically", () => {
    const normalized = normalizeAiResult(result);
    expect(normalized.findings[0].evidenceReferences).toEqual(["evidence/1", "evidence/1"]);
    expect(deduplicateFindings(normalized.findings)).toHaveLength(1);
    expect(deduplicateFindings(normalized.findings)[0].confidence).toBe(0.8);
  });

  it("correlates matching keys and flags contradictory conclusions", () => {
    const other = { ...result, taskId: "task-2", findings: [{ key: "risk-a", conclusion: "No issue", confidence: 0.9, evidenceReferences: ["evidence/3"] }] };
    const correlated = correlateFindings([result, other]);
    expect(correlated[0].taskIds).toEqual(["task-1", "task-2"]);
    expect(correlated[0].requiresHumanReview).toBe(true);
  });

  it("produces stable provenance hashes", () => {
    const first = buildAiResultProvenance(result);
    const second = buildAiResultProvenance(result);
    expect(first).toEqual(second);
    expect(first.inputHash).toHaveLength(64);
    expect(first.outputHash).toHaveLength(64);
  });

  it("requires review for low confidence synthesis", () => {
    const low = { ...result, findings: [{ key: "risk-low", conclusion: "Uncertain", confidence: 0.2, evidenceReferences: [] }] };
    expect(synthesizeAiResults([low]).requiresHumanReview).toBe(true);
  });

  it("fails closed on oversized or invalid inputs", () => {
    expect(() => normalizeAiResult({ ...result, input: "x".repeat(16_385) })).toThrow();
    expect(() => normalizeAiResult({ ...result, findings: Array.from({ length: 101 }, () => result.findings[0]) })).toThrow();
    expect(() => normalizeAiResult({ ...result, findings: [{ ...result.findings[0], confidence: 2 }] })).toThrow();
  });
});
