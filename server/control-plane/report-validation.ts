import type { ReportInput } from "./report-composer";

export type ReportValidation = { missingFields: string[]; warnings: string[]; blocked: boolean; readyForReview: boolean };
const secretPatterns = [/AKIA[0-9A-Z]{16}/, /-----BEGIN (?:RSA|OPENSSH|EC) PRIVATE KEY-----/, /(?:api[_-]?key|secret|token)\s*[:=]\s*['\"][^'\"]{12,}/i];

export function validateReportInput(input: ReportInput, scopeSummary = ""): ReportValidation {
  const missingFields = [
    ["title", input.title.trim().length >= 3],
    ["summary", input.summary.trim().length >= 20],
    ["impact", input.impact.trim().length >= 20],
    ["evidence", input.evidence.length > 0],
    ["reproductionNotes", input.reproductionNotes.length > 0],
  ].filter(([, valid]) => !valid).map(([field]) => String(field));
  const allText = [input.title, input.summary, input.impact, ...input.evidence, ...input.reproductionNotes, input.remediation ?? ""].join("\n");
  const warnings: string[] = [];
  if (secretPatterns.some(pattern => pattern.test(allText))) warnings.push("Potential secret or credential detected; remove it and attach a redacted reference instead.");
  const evidenceSet = new Set(input.evidence.map(item => item.trim().toLowerCase()).filter(Boolean));
  if (evidenceSet.size !== input.evidence.filter(item => item.trim()).length) warnings.push("Duplicate evidence items detected.");
  if (/out of scope|not allowed|excluded/i.test(scopeSummary)) warnings.push("Scope text contains exclusion language; confirm the finding target is explicitly allowed.");
  if (input.severity === "critical") warnings.push("Critical severity requires explicit human review before export.");
  return { missingFields, warnings, blocked: warnings.some(warning => warning.includes("secret")), readyForReview: missingFields.length === 0 && !warnings.some(warning => warning.includes("secret")) };
}
