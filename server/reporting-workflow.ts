import { createHash, randomUUID } from "node:crypto";

export type ReportView = "executive" | "technical" | "disclosure" | "retest";
export type ReportStatus = "draft" | "ready" | "approved" | "published";
export type ReportInput = { workspaceId: number; title: string; view: ReportView; findingIds: number[]; evidenceIds: number[]; createdByUserId: number };
export type Report = ReportInput & { id: string; version: number; status: ReportStatus; privateByDefault: true; contentHash: string; createdAt: string };
const reports = new Map<string, Report>();
function hashReport(input: ReportInput) { return createHash("sha256").update(JSON.stringify(input)).digest("hex"); }
export function createReport(input: ReportInput): Report {
  if (!Number.isSafeInteger(input.workspaceId) || input.workspaceId <= 0) throw new Error("Invalid workspaceId.");
  if (!Number.isSafeInteger(input.createdByUserId) || input.createdByUserId <= 0) throw new Error("Invalid createdByUserId.");
  if (!input.title.trim()) throw new Error("Report title is required.");
  if (!input.findingIds.length) throw new Error("At least one finding is required.");
  if (!["executive", "technical", "disclosure", "retest"].includes(input.view)) throw new Error("Invalid report view.");
  const id = `rpt_${randomUUID()}`;
  const report: Report = { ...input, id, version: 1, status: "draft", privateByDefault: true, contentHash: hashReport(input), createdAt: new Date().toISOString() };
  reports.set(id, report); return report;
}
export function updateReportStatus(id: string, status: ReportStatus): Report {
  const report = reports.get(id); if (!report) throw new Error("Report not found.");
  if (!["draft", "ready", "approved", "published"].includes(status)) throw new Error("Invalid report status.");
  if (status === "published" && report.status !== "approved") throw new Error("Report must be approved before publication.");
  const next = { ...report, status, version: report.version + 1 }; reports.set(id, next); return next;
}
export function exportReport(id: string) {
  const report = reports.get(id); if (!report) throw new Error("Report not found.");
  if (report.status !== "approved" && report.status !== "published") throw new Error("Report is not ready for export.");
  return { reportId: report.id, version: report.version, format: "json", privateByDefault: true, sanitized: true, contentHash: report.contentHash };
}
export function listReports(workspaceId: number) { return [...reports.values()].filter(r => r.workspaceId === workspaceId); }
