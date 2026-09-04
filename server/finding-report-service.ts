import * as controlPlane from "./control-plane/service";
import { composeReport, type ReportPlatform, type ReportResult } from "./control-plane/report-composer";
import { validateReportInput } from "./control-plane/report-validation";

export type FindingReportPreview = {
  findingId: number;
  platform: ReportPlatform;
  report: ReportResult;
  readyForReview: boolean;
};

function parseDraft(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map(item => item.trim())
    : [];
}

/**
 * Reporting is deliberately downstream of finding human review. This function
 * only prepares a reviewable report; it never submits externally.
 */
export async function generateFindingReportPreview(
  userId: number,
  findingId: number,
  platform: ReportPlatform
): Promise<FindingReportPreview> {
  const findings = await controlPlane.listFindings(userId);
  const finding = findings.find(item => item.id === findingId);
  if (!finding) throw new Error("Finding tidak ditemukan atau tidak dapat diakses.");
  if (finding.status !== "validated") {
    throw new Error("Report hanya dapat dibuat dari finding yang sudah validated.");
  }
  if (finding.humanReviewStatus !== "approved") {
    throw new Error("Human review wajib disetujui sebelum report generation.");
  }

  const draft = parseDraft(finding.reportDraft);
  const evidence = stringArray(draft.evidenceRefs);
  const reproductionNotes = stringArray(draft.reproductionNotes);
  const reportInput = {
    title: finding.title,
    severity: finding.severity,
    summary: typeof draft.summary === "string" && draft.summary.trim().length >= 20
      ? draft.summary.trim()
      : finding.impactSummary,
    impact: finding.impactSummary,
    evidence: evidence.length ? evidence : [
      typeof draft.requestId === "string" ? `request:${draft.requestId}` : `finding:${finding.id}`,
    ],
    reproductionNotes: reproductionNotes.length
      ? reproductionNotes
      : ["Reproduce using the preserved execution evidence and request provenance."],
    remediation: typeof draft.remediation === "string" ? draft.remediation.trim() : undefined,
  } as const;

  const validation = validateReportInput(reportInput, "");
  if (!validation.valid) {
    throw new Error(`Report input invalid: ${validation.errors.join("; ")}`);
  }
  const report = composeReport(reportInput, platform);
  return {
    findingId,
    platform,
    report,
    readyForReview: report.readyForReview,
  };
}
