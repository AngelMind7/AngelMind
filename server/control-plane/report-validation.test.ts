import { describe, expect, it } from "vitest";
import { validateReportInput } from "./report-validation";

const valid = { title: "Authorization boundary issue", severity: "high" as const, summary: "A clear issue was observed in the authorized program context with reproducible evidence.", impact: "The issue could expose restricted information to an unauthorized user under the documented conditions.", evidence: ["evidence://redacted-1"], reproductionNotes: ["Review the attached researcher-owned observation without sending new requests."], remediation: "Enforce the intended authorization boundary." };

describe("report validation", () => {
  it("blocks likely secrets and warns about exclusions", () => {
    const result = validateReportInput({ ...valid, evidence: ["api_key=\"super-secret-value-123\""] }, "Excluded staging target; not allowed");
    expect(result.blocked).toBe(true);
    expect(result.readyForReview).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(1);
  });
  it("detects duplicate evidence and missing required fields", () => {
    const result = validateReportInput({ ...valid, title: "", evidence: ["same", "same"], reproductionNotes: [] });
    expect(result.missingFields).toEqual(["title", "reproductionNotes"]);
    expect(result.warnings).toContain("Duplicate evidence items detected.");
  });
  it("allows a complete report with non-critical severity", () => {
    expect(validateReportInput(valid, "Only example.com is allowed").readyForReview).toBe(true);
  });
});
