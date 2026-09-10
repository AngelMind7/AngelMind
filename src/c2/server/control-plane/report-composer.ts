export type ReportPlatform = "hackerone" | "bugcrowd" | "intigriti" | "markdown";
export type ReportInput = { title: string; severity: "informational" | "low" | "medium" | "high" | "critical"; summary: string; impact: string; evidence: string[]; reproductionNotes: string[]; remediation?: string };
export type ReportResult = { platform: ReportPlatform; title: string; body: string; missingFields: string[]; readyForReview: boolean; autonomousSubmission: false };

export function composeReport(input: ReportInput, platform: ReportPlatform): ReportResult {
  if (!input || typeof input !== "object" || !["hackerone", "bugcrowd", "intigriti", "markdown"].includes(platform)) throw new Error("Report input or platform is invalid.");
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const summary = typeof input.summary === "string" ? input.summary.trim() : "";
  const impact = typeof input.impact === "string" ? input.impact.trim() : "";
  const evidence = Array.isArray(input.evidence) ? input.evidence.filter((value): value is string => typeof value === "string").map(value => value.trim()).filter(Boolean) : [];
  const reproductionNotes = Array.isArray(input.reproductionNotes) ? input.reproductionNotes.filter((value): value is string => typeof value === "string").map(value => value.trim()).filter(Boolean) : [];
  const remediation = typeof input.remediation === "string" ? input.remediation.trim() : "";
  const severity = ["informational", "low", "medium", "high", "critical"].includes(input.severity) ? input.severity : "informational";
  const missingFields = [
    ["title", title.length >= 3],
    ["summary", summary.length >= 20],
    ["impact", impact.length >= 20],
    ["evidence", evidence.length > 0],
    ["reproductionNotes", reproductionNotes.length > 0],
  ].filter(([, valid]) => !valid).map(([field]) => String(field));
  const sections = `## Summary\n${summary}\n\n## Impact\n${impact}\n\n## Evidence\n${evidence.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n## Reproduction notes\n${reproductionNotes.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n## Remediation\n${remediation || "Please assess and propose a remediation."}`;
  const body = platform === "hackerone" ? `# ${title}\n\n**Severity:** ${severity}\n\n${sections}` : platform === "bugcrowd" ? `# ${title}\n\n**Priority suggestion:** ${severity}\n\n### Description\n${summary}\n\n### Technical details\n${reproductionNotes.join("\n")}\n\n### Impact\n${impact}\n\n### Evidence\n${evidence.join("\n")}\n\n### Remediation\n${remediation || "Please assess and propose a remediation."}` : platform === "intigriti" ? `# ${title}\n\n**Severity:** ${severity}\n\n### Vulnerability description\n${summary}\n\n### Steps to reproduce\n${reproductionNotes.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n### Impact\n${impact}\n\n### Proof / evidence\n${evidence.join("\n")}\n\n### Suggested fix\n${remediation || "Please assess and propose a remediation."}` : `# ${title}\n\n**Severity:** ${severity}\n\n${sections}`;
  return { platform, title, body, missingFields, readyForReview: missingFields.length === 0, autonomousSubmission: false };
}
