import { describe, expect, it } from "vitest";
import { buildComplianceMap, buildRiskAssessment, buildVendorAssessment } from "./governance-audit";

describe("governance and audit", () => {
  it("maps required compliance frameworks", () => expect(buildComplianceMap("SOC2").evidenceRequired).toBe(true));
  it("scores risk deterministically", () => expect(buildRiskAssessment({ title: "test", likelihood: 5, impact: 5 }).level).toBe("critical"));
  it("requires vendor review for sensitive/high risk access", () => expect(buildVendorAssessment({ vendor: "x", dataAccess: "sensitive", criticality: "low" }).requiresReview).toBe(true));
});
