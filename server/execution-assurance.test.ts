import { describe, expect, it } from "vitest";
import { buildImpactProof, generateExecutionReport, validateEvidenceChain } from "./execution-assurance";

const evidence = {
  requestId: "req-1",
  toolKey: "safe.adapter",
  rawOutputSha256: "raw-hash",
  normalizedEvidenceSha256: "normalized-hash",
  evidenceRefs: ["req-1", "observation:42"],
};

const finding = {
  findingId: 42,
  ruleId: "rule-1",
  emittedKey: "signal.test",
  title: "Test signal",
  severity: "medium" as const,
  confidence: 0.9,
  evidenceRefs: ["observation:42"],
};

describe("execution assurance", () => {
  it("requires hashes and a linked evidence reference", () => {
    expect(validateEvidenceChain(evidence, finding)).toMatchObject({ valid: true, reason: "valid" });
    expect(validateEvidenceChain({ ...evidence, normalizedEvidenceSha256: null }, finding).valid).toBe(false);
    expect(validateEvidenceChain(evidence, { ...finding, evidenceRefs: ["missing"] }).valid).toBe(false);
  });

  it("only supports impact proof when the evidence chain is valid", () => {
    expect(buildImpactProof(evidence, finding).supported).toBe(true);
    expect(buildImpactProof({ ...evidence, evidenceRefs: [] }, finding).supported).toBe(false);
  });

  it("generates deterministic review-gated reports and never permits direct submission", () => {
    const report = generateExecutionReport({ capability: "safe-capability", evidence, finding });
    expect(report).not.toBeNull();
    expect(report?.status).toBe("review_required");
    expect(report?.submission).toEqual({ allowed: false, reason: "manual_review_required" });
    expect(report?.reportId).toHaveLength(64);
  });

  it("withholds reports when the finding cannot be tied to evidence", () => {
    expect(generateExecutionReport({ capability: "safe-capability", evidence, finding: { ...finding, evidenceRefs: ["missing"] } })).toBeNull();
  });
});
