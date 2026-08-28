export type ReportPlatform = "hackerone" | "bugcrowd" | "intigriti" | "markdown";
export type ReportInput = { title: string; severity: "informational" | "low" | "medium" | "high" | "critical"; summary: string; impact: string; evidence: string[]; reproductionNotes: string[]; remediation?: string };
export type ReportResult = { platform: ReportPlatform; title: string; body: string; missingFields: string[]; readyForReview: boolean; autonomousSubmission: false };

export function composeReport(input: ReportInput, platform: ReportPlatform): ReportResult {
  const missingFields = [
    ["title", input.title.trim().length >= 3],
    ["summary", input.summary.trim().length >= 20],
    ["impact", input.impact.trim().length >= 20],
    ["evidence", input.evidence.length > 0],
    ["reproductionNotes", input.reproductionNotes.length > 0],
  ].filter(([, valid]) => !valid).map(([field]) => String(field));
  const sections = `## Summary\n${input.summary}\n\n## Impact\n${input.impact}\n\n## Evidence\n${input.evidence.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n## Reproduction notes\n${input.reproductionNotes.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n## Remediation\n${input.remediation?.trim() || "Please assess and propose a remediation."}`;
  const body = platform === "hackerone" ? `# ${input.title}\n\n**Severity:** ${input.severity}\n\n${sections}` : platform === "bugcrowd" ? `# ${input.title}\n\n**Priority suggestion:** ${input.severity}\n\n### Description\n${input.summary}\n\n### Technical details\n${input.reproductionNotes.join("\n")}\n\n### Impact\n${input.impact}\n\n### Evidence\n${input.evidence.join("\n")}\n\n### Remediation\n${input.remediation?.trim() || "Please assess and propose a remediation."}` : platform === "intigriti" ? `# ${input.title}\n\n**Severity:** ${input.severity}\n\n### Vulnerability description\n${input.summary}\n\n### Steps to reproduce\n${input.reproductionNotes.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n### Impact\n${input.impact}\n\n### Proof / evidence\n${input.evidence.join("\n")}\n\n### Suggested fix\n${input.remediation?.trim() || "Please assess and propose a remediation."}` : `# ${input.title}\n\n**Severity:** ${input.severity}\n\n${sections}`;
  return { platform, title: input.title.trim(), body, missingFields, readyForReview: missingFields.length === 0, autonomousSubmission: false };
}
