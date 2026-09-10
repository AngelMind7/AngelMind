import { describe, expect, it } from "vitest";
import {
  MASTER_CORRELATION_RULE_COUNTS,
  masterCompoundCorrelationRules,
  masterCorrelationRules,
  masterSequentialCorrelationRules,
  masterSeverityOverrides,
} from "./master-correlation-rules";

describe("master correlation registry", () => {
  it("contains the canonical 37 sequential and 10 compound rules", () => {
    expect(masterSequentialCorrelationRules).toHaveLength(37);
    expect(masterCompoundCorrelationRules).toHaveLength(10);
    expect(masterCorrelationRules).toHaveLength(47);
    expect(MASTER_CORRELATION_RULE_COUNTS.total).toBe(47);
  });

  it("keeps rule IDs unique and preserves the four severity overrides", () => {
    const ids = masterCorrelationRules.map(rule => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(masterSeverityOverrides).toHaveLength(4);
    expect(masterSeverityOverrides.every(item => item.severity === "critical")).toBe(true);
  });

  it("contains the critical chain rules that must escalate review", () => {
    expect(masterCorrelationRules.find(rule => rule.id === "SEQ-001")?.priority).toBe(100);
    expect(masterCorrelationRules.find(rule => rule.id === "SEQ-010")?.emits).toBe("rce-command-injection");
    expect(masterCorrelationRules.find(rule => rule.id === "COMP-003")?.emits).toBe("cloud-s3-public");
  });
});
