import { describe, expect, it } from "vitest";
import { evaluateMasterCorrelation } from "./master-correlation-service";

describe("evaluateMasterCorrelation", () => {
  it("emits the canonical SSRF chain and critical escalation", () => {
    const result = evaluateMasterCorrelation([
      { key: "ssrf-internal", value: "confirmed", confidence: 1, evidenceRefs: ["ev-1"] },
      { key: "cloud-metadata-exposure", value: "confirmed", confidence: 1, evidenceRefs: ["ev-2"] },
      { key: "cloud-iam-overpermission", value: "confirmed", confidence: 1, evidenceRefs: ["ev-3"] },
    ]);

    expect(result.criticalEscalation).toBe(true);
    expect(result.matches.some(match => match.ruleId === "SEQ-001")).toBe(true);
    expect(result.matches.some(match => match.ruleId === "SEQ-002")).toBe(true);
    expect(result.matches.some(match => match.ruleId === "SEQ-003")).toBe(true);
    expect(result.severityOverride?.title).toBe("Complete Cloud Account Takeover");
  });
});
