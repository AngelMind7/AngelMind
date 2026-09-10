import { describe, expect, it } from "vitest";
import { composeReport } from "./control-plane/report-composer";
import { validateReportInput } from "./control-plane/report-validation";

describe("finding report generation contract", () => {
  it("requires complete evidence and reproduction material before review", () => {
    const input = {
      title: "Validated finding",
      severity: "high" as const,
      summary: "A validated security finding with sufficient technical context.",
      impact: "The finding demonstrates a material security impact for the affected asset.",
      evidence: ["request:req-123"],
      reproductionNotes: ["Replay the preserved request against the authorized test asset."],
    };
    const validation = validateReportInput(input, "");
    expect(validation.blocked).toBe(false);
    expect(validation.readyForReview).toBe(true);
    expect(composeReport(input, "markdown").readyForReview).toBe(true);
  });

  it("blocks secrets from becoming report material", () => {
    const validation = validateReportInput({
      title: "Finding with secret",
      severity: "high",
      summary: "This summary is intentionally long enough for the report contract.",
      impact: "This impact statement is intentionally long enough for validation.",
      evidence: ["api_key: '0123456789abcdef'"],
      reproductionNotes: ["Do not reproduce with the exposed credential."],
    }, "");
    expect(validation.blocked).toBe(true);
    expect(validation.readyForReview).toBe(false);
  });
});
