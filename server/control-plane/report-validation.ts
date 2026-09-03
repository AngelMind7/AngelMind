import type { ReportInput } from "./report-composer";

export type ReportValidation = { missingFields: string[]; warnings: string[]; blocked: boolean; readyForReview: boolean };
const secretPatterns = [/AKIA[0-9A-Z]{16}/, /-----BEGIN (?:RSA|OPENSSH|EC) PRIVATE KEY-----/, /(?:api[_-]?key|secret|token)\s*[:=]\s*['\"][^'\"]{12,}/i];

export function validateReportInput(input: ReportInput, scopeSummary = ""): ReportValidation {
  if (!input || typeof input !== "object") throw new Error("Report input is invalid.");
  const safeString = (value: unknown) => typeof value === "string" ? value : "";
  const evidence = Array.isArray(input.evidence) && input.evidence.every(item => typeof item === "string") ? input.evidence : [];
  const reproductionNotes = Array.isArray(input.reproductionNotes) && input.reproductionNotes.every(item => typeof item === "string") ? input.reproductionNotes : [];
  const title = safeString(input.title);
  const summary = safeString(input.summary);
  const impact = safeString(input.impact);
  const remediation = safeString(input.remediation);
  const missingFields = [
    ["title", title.trim().length >= 3],
    ["summary", summary.trim().length >= 20],
    ["impact", impact.trim().length >= 20],
    ["evidence", evidence.length > 0],
    ["reproductionNotes", reproductionNotes.length > 0],
  ].filter(([, valid]) => !valid).map(([field]) => String(field));
  const allText = [title, summary, impact, ...evidence, ...reproductionNotes, remediation].join("\n");
  const warnings: string[] = [];
  if (secretPatterns.some(pattern => pattern.test(allText))) warnings.push("Potential secret or credential detected; remove it and attach a redacted reference instead.");
  const evidenceSet = new Set(evidence.map(item => item.trim().toLowerCase()).filter(Boolean));
  if (evidenceSet.size !== evidence.filter(item => item.trim()).length) warnings.push("Duplicate evidence items detected.");
  if (typeof scopeSummary === "string" && /out of scope|not allowed|excluded/i.test(scopeSummary)) warnings.push("Scope text contains exclusion language; confirm the finding target is explicitly allowed.");
  if (input.severity === "critical") warnings.push("Critical severity requires explicit human review before export.");
  return { missingFields, warnings, blocked: warnings.some(warning => warning.includes("secret")), readyForReview: missingFields.length === 0 && !warnings.some(warning => warning.includes("secret")) };
}
