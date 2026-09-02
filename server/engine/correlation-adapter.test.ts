import { describe, expect, it } from "vitest";
import { runCorrelation } from "./correlation-adapter";
import { SEQUENTIAL_RULES } from "./correlation-rules";

describe("correlation adapter", () => {
  it("contains all 37 sequential rules from the master specification", () => {
    expect(SEQUENTIAL_RULES).toHaveLength(37);
    expect(SEQUENTIAL_RULES.map(rule => rule.ruleId)).toEqual(
      Array.from(
        { length: 37 },
        (_, index) => `SEQ-${String(index + 1).padStart(3, "0")}`
      )
    );
  });

  it("does not fire evidence-gated rules without matching evidence", () => {
    const results = runCorrelation([
      { vectorKey: "ssrf-internal", confidence: 90, evidenceRefs: ["e-1"] },
    ]);

    expect(results.some(result => result.ruleId === "SEQ-001")).toBe(false);
  });

  it("fires evidence-gated rules when evidence matches", () => {
    const results = runCorrelation([
      {
        vectorKey: "ssrf-internal",
        confidence: 90,
        evidenceRefs: ["e-1"],
        evidence: { cloud_metadata_response: "role credentials" },
      },
    ]);

    expect(results.find(result => result.ruleId === "SEQ-001")).toMatchObject({
      emittedKey: "vector.cloud-metadata-exposure",
      evidenceRefs: ["e-1"],
    });
  });

  it("preserves every target vector from a multi-target rule", () => {
    const results = runCorrelation([
      { vectorKey: "websocket-hijack", confidence: 80, evidenceRefs: ["e-2"] },
    ]);

    expect(
      results
        .filter(result => result.ruleId === "SEQ-028")
        .map(result => result.emittedKey)
        .sort()
    ).toEqual(["vector.idor-horizontal", "vector.idor-vertical"]);
  });
});
