import { createHash } from "node:crypto";

export type CustomScriptLanguage = "python" | "javascript" | "go" | "docker" | "ai_prompt";

export interface CustomScriptAnalysis {
  accepted: boolean;
  language: CustomScriptLanguage;
  sha256: string;
  sizeBytes: number;
  risk: "low" | "medium" | "high";
  findings: string[];
  limits: { maxBytes: number; network: "disabled"; filesystem: "workspace-only"; execution: "not-performed" };
}

const MAX_BYTES = 256 * 1024;
const patterns: Array<[RegExp, string]> = [
  [/child_process|subprocess|os\.system|exec\(|spawn\(/i, "process execution primitive detected"],
  [/socket|net\.Dial|requests\.(get|post)|fetch\(/i, "network primitive detected"],
  [/base64|atob\(|btoa\(|Buffer\.from/i, "encoded-data primitive detected"],
  [/rm\s+-rf|format\s+c:|mkfs|shutdown\s+/i, "destructive command pattern detected"],
  [/credential|password|secret|api[_-]?key|token/i, "credential-sensitive token detected"],
];

export function analyzeCustomScript(language: CustomScriptLanguage, source: string): CustomScriptAnalysis {
  const bytes = Buffer.byteLength(source, "utf8");
  if (bytes > MAX_BYTES) throw new Error(`Custom script exceeds ${MAX_BYTES} byte limit.`);
  if (!source.trim()) throw new Error("Custom script cannot be empty.");
  const findings = patterns.filter(([pattern]) => pattern.test(source)).map(([, description]) => description);
  const highRisk = findings.some(item => /destructive|process execution/i.test(item));
  const mediumRisk = findings.length > 0;
  return {
    accepted: !highRisk,
    language,
    sha256: createHash("sha256").update(source).digest("hex"),
    sizeBytes: bytes,
    risk: highRisk ? "high" : mediumRisk ? "medium" : "low",
    findings,
    limits: { maxBytes: MAX_BYTES, network: "disabled", filesystem: "workspace-only", execution: "not-performed" },
  };
}
