import { describe, expect, it } from "vitest";
import { assertRetestOutcome } from "./retest-validation";

describe("retest outcome validation", () => {
  it("requires evidence before resolving a finding", () => {
    expect(() => assertRetestOutcome({ status: "passed", resultSummary: "The issue is no longer reproducible." })).toThrow(/evidence/i);
    expect(assertRetestOutcome({ status: "passed", resultSummary: "The issue is no longer reproducible.", evidenceArtifactId: 12 })).toEqual({ resultSummary: "The issue is no longer reproducible.", evidenceArtifactId: 12 });
    expect(assertRetestOutcome({ status: "passed", resultSummary: "Prior evidence remains valid.", existingEvidenceArtifactId: 12 })).toEqual({ resultSummary: "Prior evidence remains valid.", evidenceArtifactId: 12 });
  });

  it("allows non-passed outcomes without evidence but still bounds the summary", () => {
    expect(assertRetestOutcome({ status: "inconclusive", resultSummary: "The environment was unavailable." })).toEqual({ resultSummary: "The environment was unavailable.", evidenceArtifactId: null });
    expect(() => assertRetestOutcome({ status: "failed", resultSummary: "  " })).toThrow(/summary/i);
    expect(() => assertRetestOutcome({ status: "failed", resultSummary: "x".repeat(20_001) })).toThrow(/summary/i);
  });
});

