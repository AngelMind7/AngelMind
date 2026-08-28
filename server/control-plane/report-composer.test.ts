import { describe, expect, it } from "vitest";
import { composeReport } from "./report-composer";

const input = { title: "Stored evidence disclosure", severity: "high" as const, summary: "A documented issue exposes sensitive metadata within the authorized program scope.", impact: "An attacker could infer information that should remain restricted to authorized users.", evidence: ["Screenshot reference: evidence://artifact-1"], reproductionNotes: ["Review the attached evidence and confirm the observed state without sending new requests."], remediation: "Restrict the response to the intended authorization boundary." };

describe("report composer", () => {
  it("renders each supported platform template", () => {
    for (const platform of ["hackerone", "bugcrowd", "intigriti", "markdown"] as const) {
      const report = composeReport(input, platform);
      expect(report.readyForReview).toBe(true);
      expect(report.body).toContain(input.title);
      expect(report.autonomousSubmission).toBe(false);
    }
  });

  it("blocks review readiness when required content is missing", () => {
    const report = composeReport({ ...input, evidence: [], reproductionNotes: [] }, "markdown");
    expect(report.readyForReview).toBe(false);
    expect(report.missingFields).toEqual(["evidence", "reproductionNotes"]);
  });
});
