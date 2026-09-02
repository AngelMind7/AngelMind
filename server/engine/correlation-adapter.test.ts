import { describe, expect, it } from "vitest";
import {
  evaluateCategoryEscalations,
  evaluatePrerequisites,
  runCorrelation,
  type ConfirmedVectorFact,
} from "./correlation-adapter";
import { SEQUENTIAL_RULES } from "./correlation-rules";

const fact = (
  vectorKey: string,
  evidenceRefs: string[] = ["evidence-1"],
  overrides: Partial<ConfirmedVectorFact> = {}
): ConfirmedVectorFact => ({
  vectorKey,
  confidence: 90,
  evidenceRefs,
  ...overrides,
});

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

  it("returns category escalation recommendations without mutating findings", () => {
    const results = evaluateCategoryEscalations([
      {
        vectorKey: "sqli-classic",
        category: "Injection",
        confidence: 90,
        evidenceRefs: ["e-3"],
      },
      {
        vectorKey: "ssti-server-side",
        category: "Injection",
        confidence: 90,
        evidenceRefs: ["e-4"],
      },
    ]);

    expect(results).toContainEqual(
      expect.objectContaining({
        ruleId: "CAT-001",
        action: "escalate_approval_gate",
        approvalGate: "human_approval",
      })
    );
  });

  describe("prerequisite rules PRE-001 to PRE-003", () => {
    it("PRE-001 maps XXE to SSRF with automatic update enabled", () => {
      const result = evaluatePrerequisites([
        fact("xxe-out-of-band", ["ev-xxe-1"]),
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        ruleId: "PRE-001",
        sourceVector: "xxe-out-of-band",
        targetVector: "ssrf-internal",
        autoUpdate: true,
        evidenceRefs: ["ev-xxe-1"],
        prerequisiteSatisfied: expect.stringContaining("internal network"),
      });
      expect(result[0]).not.toHaveProperty("note");
    });

    it("PRE-002 maps source-map exposure to JWT analysis", () => {
      const result = evaluatePrerequisites([
        fact("info-sourcemap", ["ev-map-1"]),
      ]);

      expect(result).toEqual([
        expect.objectContaining({
          ruleId: "PRE-002",
          sourceVector: "info-sourcemap",
          targetVector: "auth-jwt-alg-confusion",
          autoUpdate: true,
          evidenceRefs: ["ev-map-1"],
        }),
      ]);
    });

    it("PRE-003 maps stack traces to deserialization analysis with manual review", () => {
      const result = evaluatePrerequisites([
        fact("info-stack-trace", ["ev-stack-1"]),
      ]);

      expect(result).toEqual([
        expect.objectContaining({
          ruleId: "PRE-003",
          sourceVector: "info-stack-trace",
          targetVector: "deserialization-insecure",
          autoUpdate: false,
          evidenceRefs: ["ev-stack-1"],
          note: expect.stringContaining("manual gadget chain analysis"),
        }),
      ]);
    });

    it("fires PRE-001, PRE-002, and PRE-003 independently when all sources exist", () => {
      const result = evaluatePrerequisites([
        fact("xxe-out-of-band", ["ev-1"]),
        fact("info-sourcemap", ["ev-2"]),
        fact("info-stack-trace", ["ev-3"]),
      ]);

      expect(result.map(item => item.ruleId)).toEqual([
        "PRE-001",
        "PRE-002",
        "PRE-003",
      ]);
    });

    it("does not fire when only a target vector is present", () => {
      const result = evaluatePrerequisites([
        fact("ssrf-internal"),
        fact("auth-jwt-alg-confusion"),
        fact("deserialization-insecure"),
      ]);

      expect(result).toEqual([]);
    });

    it("ignores unrelated vectors", () => {
      const result = evaluatePrerequisites([
        fact("cloud-metadata-exposure"),
        fact("sqli-classic"),
        fact("auth-jwt-none"),
      ]);

      expect(result).toEqual([]);
    });

    it("deduplicates and sorts evidence references across duplicate source facts", () => {
      const result = evaluatePrerequisites([
        fact("xxe-out-of-band", ["z-ref", "a-ref", "z-ref"]),
        fact("xxe-out-of-band", ["b-ref", "a-ref"]),
      ]);

      expect(result).toEqual([
        expect.objectContaining({
          ruleId: "PRE-001",
          evidenceRefs: ["a-ref", "b-ref", "z-ref"],
        }),
      ]);
    });

    it("returns one recommendation per rule when a source vector is duplicated", () => {
      const result = evaluatePrerequisites([
        fact("info-sourcemap", ["ev-1"]),
        fact("info-sourcemap", ["ev-2"]),
      ]);

      expect(result.filter(item => item.ruleId === "PRE-002")).toHaveLength(1);
      expect(result[0]?.evidenceRefs).toEqual(["ev-1", "ev-2"]);
    });

    it("does not mutate the input facts", () => {
      const input = [
        fact("xxe-out-of-band", ["e-1", "e-1"]),
        fact("info-stack-trace"),
      ];
      const snapshot = structuredClone(input);

      evaluatePrerequisites(input);

      expect(input).toEqual(snapshot);
    });

    it("keeps the current contract when evidenceRefs is empty", () => {
      const result = evaluatePrerequisites([fact("info-sourcemap", [])]);

      expect(result).toEqual([
        expect.objectContaining({
          ruleId: "PRE-002",
          evidenceRefs: [],
        }),
      ]);
    });

    it("does not use confidence as an implicit prerequisite threshold", () => {
      const result = evaluatePrerequisites([
        fact("xxe-out-of-band", ["e-low"], { confidence: 0 }),
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]?.ruleId).toBe("PRE-001");
    });

    it("matches source by vectorKey while preserving additional evidence payload", () => {
      const result = evaluatePrerequisites([
        fact("info-stack-trace", ["e-status"], {
          evidence: { status: "OPEN", framework: "Java" },
        }),
      ]);

      expect(result[0]).toMatchObject({
        ruleId: "PRE-003",
        sourceVector: "info-stack-trace",
      });
    });
  });
});
