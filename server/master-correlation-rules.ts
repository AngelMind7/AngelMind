import type { CorrelationRule } from "./correlation-engine";

type MasterSeverity = "CRITICAL" | "HIGH" | "MEDIUM";
const priority = (severity: MasterSeverity) =>
  severity === "CRITICAL" ? 100 : severity === "HIGH" ? 75 : 50;

export const masterSequentialCorrelationRules: readonly CorrelationRule[] = [
  ["SEQ-001", "SSRF → Cloud Metadata", "ssrf-internal", "cloud-metadata-exposure", "CRITICAL"],
  ["SEQ-002", "Cloud Metadata → IAM", "cloud-metadata-exposure", "cloud-iam-overpermission", "CRITICAL"],
  ["SEQ-003", "Cloud Metadata → S3", "cloud-metadata-exposure", "cloud-s3-public", "HIGH"],
  ["SEQ-004", "JWT Alg Confusion → JWT None", "jwt-alg-confusion", "jwt-none", "CRITICAL"],
  ["SEQ-005", "JWT None → IDOR Horizontal", "jwt-none", "idor-horizontal", "HIGH"],
  ["SEQ-006", "JWT Bypass → IDOR Vertical", "jwt-none", "idor-vertical", "CRITICAL"],
  ["SEQ-007", "SQLi Classic → SQLi Blind", "sqli-classic", "sqli-blind", "HIGH"],
  ["SEQ-008", "SQLi → SSRF Internal", "sqli-classic", "ssrf-internal", "HIGH"],
  ["SEQ-009", "XXE OOB → SSRF", "xxe-out-of-band", "ssrf-internal", "CRITICAL"],
  ["SEQ-010", "SSTI → RCE", "ssti-server-side", "rce-command-injection", "CRITICAL"],
  ["SEQ-011", "Host Header → Password Reset", "host-header-injection", "auth-password-reset-poisoning", "CRITICAL"],
  ["SEQ-012", "GraphQL Introspection → Batching", "graphql-introspection", "graphql-batching", "HIGH"],
  ["SEQ-013", "GraphQL Batching → IDOR", "graphql-batching", "idor-horizontal", "HIGH"],
  ["SEQ-014", "Secrets → OAuth Misconfig", "supply-chain-secrets", "auth-oauth-misconfig", "HIGH"],
  ["SEQ-015", "CORS → Session Fixation", "infra-cors-misconfig", "auth-session-fixation", "MEDIUM"],
  ["SEQ-016", "CRLF → Cache Poisoning", "infra-crlf-injection", "cache-poisoning", "HIGH"],
  ["SEQ-017", "Cache Poisoning → XSS Stored", "cache-poisoning", "xss-stored", "HIGH"],
  ["SEQ-018", "XSS Reflected → XSS Stored", "xss-reflected", "xss-stored", "HIGH"],
  ["SEQ-019", "XSS Stored → CSRF", "xss-stored", "csrf-bypass", "MEDIUM"],
  ["SEQ-020", "Mass Assignment → IDOR Vertical", "api-mass-assignment", "idor-vertical", "CRITICAL"],
  ["SEQ-021", "Deserialization → RCE", "deserialization-insecure", "rce-command-injection", "CRITICAL"],
  ["SEQ-022", "File Upload → RCE", "file-upload-abuse", "rce-command-injection", "CRITICAL"],
  ["SEQ-023", "LFI → Source Code", "path-traversal-lfi", "info-sourcemap", "HIGH"],
  ["SEQ-024", "Stack Trace → SQLi", "info-stack-trace", "sqli-classic", "HIGH"],
  ["SEQ-025", "Stack Trace → SSTI", "info-stack-trace", "ssti-server-side", "HIGH"],
  ["SEQ-026", "Source Map → Secrets", "info-sourcemap", "supply-chain-secrets", "HIGH"],
  ["SEQ-027", "Mobile Secrets → Cloud IAM", "mobile-hardcoded-secrets", "cloud-iam-overpermission", "HIGH"],
  ["SEQ-028", "WebSocket Hijack → IDOR", "websocket-hijack", "idor-horizontal", "HIGH"],
  ["SEQ-029", "Open Redirect → OAuth", "open-redirect", "auth-oauth-misconfig", "HIGH"],
  ["SEQ-030", "Subdomain Takeover → XSS", "subdomain-takeover", "xss-stored", "HIGH"],
  ["SEQ-031", "SQLi → Database Compromise", "sqli-classic", "sqli-blind", "CRITICAL"],
  ["SEQ-032", "IDOR → Privilege Escalation", "idor-horizontal", "idor-vertical", "HIGH"],
  ["SEQ-033", "LFI → Source Code", "path-traversal-lfi", "info-sourcemap", "HIGH"],
  ["SEQ-034", "RCE → Full Compromise", "rce-command-injection", "ssrf-internal", "CRITICAL"],
  ["SEQ-035", "SSTI → Full Compromise", "ssti-server-side", "rce-command-injection", "CRITICAL"],
  ["SEQ-036", "Race Condition → Privilege Escalation", "race-condition", "idor-vertical", "HIGH"],
  ["SEQ-037", "GraphQL Batching → Mass Data Exfil", "graphql-batching", "idor-horizontal", "CRITICAL"],
].map(([id, title, trigger, target, severity]) => ({
  id,
  category: "sequential" as const,
  requires: [trigger],
  emits: target,
  title,
  priority: priority(severity as MasterSeverity),
}));

export const masterCompoundCorrelationRules: readonly CorrelationRule[] = [
  ["COMP-001", "IDOR + Mass Assignment → Vertical IDOR", ["idor-horizontal", "api-mass-assignment"], "idor-vertical", 0.92],
  ["COMP-002", "JWT Bypass + IDOR → Account Takeover", ["jwt-none", "idor-horizontal"], "idor-vertical", 0.95],
  ["COMP-003", "SSRF + Metadata + IAM → Cloud Compromise", ["ssrf", "metadata", "iam"], "cloud-s3-public", 0.98],
  ["COMP-004", "SQLi + Stack Trace → Database Compromise", ["sqli", "stack-trace"], "sqli-blind", 0.90],
  ["COMP-005", "XSS Stored + CORS → Session Hijacking", ["xss-stored", "cors"], "session-fixation", 0.88],
  ["COMP-006", "GraphQL Introspection + Batching → Mass Data", ["introspection", "batching"], "idor-horizontal", 0.90],
  ["COMP-007", "Cache Poisoning + CRLF → Stored XSS", ["cache-poisoning", "crlf"], "xss-stored", 0.92],
  ["COMP-008", "Source Map + CVE → Known Exploit", ["sourcemap", "cve"], "sqli-classic", 0.85],
  ["COMP-009", "Mobile Secrets + OAuth → Account Takeover", ["mobile-secrets", "oauth"], "password-reset", 0.85],
  ["COMP-010", "Race Condition + Mass Assignment → Privilege", ["race-condition", "mass-assignment"], "idor-vertical", 0.88],
].map(([id, title, requires, emits, confidence]) => ({
  id,
  category: "compound" as const,
  requires,
  emits,
  title,
  priority: Math.round(confidence * 100),
}));

export const masterCorrelationRules: readonly CorrelationRule[] = [
  ...masterSequentialCorrelationRules,
  ...masterCompoundCorrelationRules,
];

export const masterSeverityOverrides = [
  { chain: ["ssrf", "metadata", "iam"], severity: "critical" as const, title: "Complete Cloud Account Takeover" },
  { chain: ["jwt-none", "idor-horizontal", "idor-vertical"], severity: "critical" as const, title: "Full Authentication & Authorization Bypass" },
  { chain: ["ssti", "rce"], severity: "critical" as const, title: "SSTI → Remote Code Execution" },
  { chain: ["cache-poisoning", "crlf", "xss-stored"], severity: "critical" as const, title: "Stored XSS in Cache via CRLF Injection" },
] as const;

export const MASTER_CORRELATION_RULE_COUNTS = {
  sequential: 37,
  compound: 10,
  total: 47,
  severityOverrides: 4,
} as const;
