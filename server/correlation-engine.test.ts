import { describe, expect, it } from "vitest";
import { evaluateCorrelationRules, mergeCorrelationResults } from "./correlation-engine";

describe("correlation engine", () => {
  it("requires every prerequisite and aggregates evidence safely", () => {
    const results = evaluateCorrelationRules([
      { key: "asset.exposed", value: "true", confidence: 80, evidenceRefs: ["e2", "e1"] },
      { key: "service.outdated", value: "true", confidence: 60, evidenceRefs: ["e1"] },
    ], [{ id: "r-1", category: "compound", requires: ["asset.exposed", "service.outdated"], emits: "risk.upgrade", title: "Upgrade risk", priority: 75, taskType: "review" }]);
    expect(results[0]).toMatchObject({ ruleId: "r-1", confidence: 70, evidenceRefs: ["e1", "e2"], emittedKey: "risk.upgrade" });
    expect(results[0].taskRecommendation?.type).toBe("review");
    expect(evaluateCorrelationRules([{ key: "asset.exposed", value: "true", confidence: 80, evidenceRefs: [] }], [{ id: "r-1", category: "compound", requires: ["asset.exposed", "service.outdated"], emits: "risk.upgrade", title: "Upgrade risk", priority: 75 }])).toEqual([]);
  });

  it("merges duplicate emitted risks by highest priority/confidence", () => {
    const merged = mergeCorrelationResults([
      { ruleId: "b", category: "sequential", title: "B", emittedKey: "risk.same", priority: 40, confidence: 50, evidenceRefs: ["e1"] },
      { ruleId: "a", category: "escalation", title: "A", emittedKey: "risk.same", priority: 90, confidence: 80, evidenceRefs: ["e2"] },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ priority: 90, confidence: 80, evidenceRefs: ["e1", "e2"] });
  });
});
