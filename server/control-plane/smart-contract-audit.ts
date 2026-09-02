export type ContractFinding = {
  rule: "tx-origin-auth" | "delegatecall" | "selfdestruct" | "unchecked-call" | "reentrancy-risk";
  severity: "medium" | "high" | "critical";
  line: number;
  evidence: string;
  remediation: string;
};

const rules: Array<{ rule: ContractFinding["rule"]; pattern: RegExp; severity: ContractFinding["severity"]; remediation: string }> = [
  { rule: "tx-origin-auth", pattern: /tx\.origin\s*==|tx\.origin\s*!=/i, severity: "high", remediation: "Use msg.sender with explicit authorization and role checks." },
  { rule: "delegatecall", pattern: /\.delegatecall\s*\(/i, severity: "high", remediation: "Restrict implementation addresses and validate upgrade/delegatecall authority." },
  { rule: "selfdestruct", pattern: /\bselfdestruct\s*\(/i, severity: "critical", remediation: "Remove selfdestruct or place it behind a reviewed, timelocked governance path." },
  { rule: "unchecked-call", pattern: /\.(call|send)\s*\(/i, severity: "high", remediation: "Check return values and bound call targets/value; prefer typed interfaces." },
  { rule: "reentrancy-risk", pattern: /\.call\s*\([^)]*\)[^;\n]*;[\s\S]{0,240}(?:balances|credit|amounts)\s*\[[^\]]+\]\s*[+\-]?=/i, severity: "critical", remediation: "Apply checks-effects-interactions and a reentrancy guard before external calls." },
];

export function analyzeSmartContractSource(source: string) {
  if (source.length === 0 || source.length > 2_000_000) throw new Error("Smart-contract source must be between 1 byte and 2 MB.");
  const lines = source.split(/\r?\n/);
  const findings: ContractFinding[] = [];
  for (const rule of rules) {
    lines.forEach((line, index) => {
      if (rule.pattern.test(line)) findings.push({ rule: rule.rule, severity: rule.severity, line: index + 1, evidence: line.trim().slice(0, 240), remediation: rule.remediation });
    });
  }
  return { status: "completed" as const, networkCalls: 0 as const, findings: findings.sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule)), summary: { critical: findings.filter(f => f.severity === "critical").length, high: findings.filter(f => f.severity === "high").length, medium: findings.filter(f => f.severity === "medium").length } };
}
