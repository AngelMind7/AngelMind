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

  it("enforces chronological order when sequential facts provide timestamps", () => {
    const rule = [{ id: "seq", category: "sequential" as const, requires: ["first", "second"], emits: "chain.complete", title: "Chain", priority: 80 }];
    expect(evaluateCorrelationRules([
      { key: "first", value: "ok", confidence: 90, evidenceRefs: ["a"], observedAt: "2026-01-01T00:00:00Z" },
      { key: "second", value: "ok", confidence: 90, evidenceRefs: ["b"], observedAt: "2026-01-01T00:01:00Z" },
    ], rule)).toHaveLength(1);
    expect(evaluateCorrelationRules([
      { key: "first", value: "ok", confidence: 90, evidenceRefs: ["a"], observedAt: "2026-01-01T00:02:00Z" },
      { key: "second", value: "ok", confidence: 90, evidenceRefs: ["b"], observedAt: "2026-01-01T00:01:00Z" },
    ], rule)).toEqual([]);
  });
});
