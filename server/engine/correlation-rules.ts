// Sumber: AngelMind Master Spec v4.0 Appendix E
// 47 dari 54 target rule (30 SEQ + 10 COMP + 4 CAT + 3 PRE).
// SEQ-031..SEQ-037 (7 rule) belum tersedia — TODO, lihat catatan di bawah.

export type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ApprovalGate = "human_approval" | "scope+approval" | "auto-run";

export interface EvidenceCondition {
  field: string;
  operator: "is_not_null" | "contains" | "equals" | "in" | "contains_any";
  value?: string | string[];
}

export interface SequentialRule {
  ruleId: string;
  name: string;
  trigger: {
    vectorKey: string;
    status: "CONFIRMED";
    evidenceCondition?: EvidenceCondition;
    requiresVector?: string;
  };
  targetVectors: string[];
  confidence: number;
  priority: Priority;
  autoFlag: boolean;
  approvalGateOverride: ApprovalGate;
  rationale: string;
}

export interface CompoundRule {
  ruleId: string;
  name: string;
  triggerVectors: string[];
  triggerStatus: ("CONFIRMED" | "SUPPORTED" | "OPEN")[];
  targetVectors: string[];
  confidence: number;
  priority: Priority;
  autoFlag: boolean;
  approvalGateOverride: ApprovalGate;
  rationale: string;
  reportSeverityOverride?: Priority;
  reportTitleTemplate?: string;
}

export interface CategoryEscalationRule {
  ruleId: string;
  name: string;
  triggerCategory: string;
  triggerCount: number;
  triggerStatus: string;
  action: "escalate_approval_gate" | "escalate_priority" | "auto_flag_all_in_category" | "auto_flag_related";
  targetCategory?: string;
  targetVectors?: string[];
  newApprovalGate?: ApprovalGate;
  newPriority?: Priority;
  rationale: string;
}

export interface PrerequisiteRule {
  ruleId: string;
  name: string;
  sourceVector: string;
  targetVector: string;
  prerequisiteSatisfied: string;
  autoUpdate: boolean;
  note?: string;
}

export interface ScoringMatrix {
  confidenceWeights: Record<string, number>;
  priorityMatrix: Record<Priority, { minConfidence: number; autoFlag: boolean; approvalGate: ApprovalGate }>;
}

// ─── 30 SEQUENTIAL RULES (SEQ-001..SEQ-030; SEQ-031..SEQ-037 TODO) ───

export const SEQUENTIAL_RULES: SequentialRule[] = [
  { ruleId: "SEQ-001", name: "SSRF → Cloud Metadata", trigger: { vectorKey: "ssrf-internal", status: "CONFIRMED", evidenceCondition: { field: "cloud_metadata_response", operator: "is_not_null" } }, targetVectors: ["cloud-metadata-exposure"], confidence: 0.95, priority: "CRITICAL", autoFlag: true, approvalGateOverride: "human_approval", rationale: "SSRF to 169.254.169.254 is direct path to cloud credential theft" },
  { ruleId: "SEQ-002", name: "Cloud Metadata → IAM Overpermission", trigger: { vectorKey: "cloud-metadata-exposure", status: "CONFIRMED", evidenceCondition: { field: "temporary_credentials", operator: "is_not_null" } }, targetVectors: ["cloud-iam-overpermission"], confidence: 0.9, priority: "CRITICAL", autoFlag: true, approvalGateOverride: "human_approval", rationale: "Stolen credentials need permission analysis to assess blast radius" },
  { ruleId: "SEQ-003", name: "Cloud Metadata → S3 Public", trigger: { vectorKey: "cloud-metadata-exposure", status: "CONFIRMED" }, targetVectors: ["cloud-s3-public"], confidence: 0.85, priority: "HIGH", autoFlag: true, approvalGateOverride: "scope+approval", rationale: "Cloud credentials often have S3 access; check bucket ACLs" },
  { ruleId: "SEQ-004", name: "JWT Alg Confusion → JWT None", trigger: { vectorKey: "auth-jwt-alg-confusion", status: "CONFIRMED" }, targetVectors: ["auth-jwt-none"], confidence: 0.8, priority: "CRITICAL", autoFlag: true, approvalGateOverride: "human_approval", rationale: "Weak JWT validation often has multiple bypass paths" },
  { ruleId: "SEQ-005", name: "JWT None → IDOR Horizontal", trigger: { vectorKey: "auth-jwt-none", status: "CONFIRMED" }, targetVectors: ["idor-horizontal"], confidence: 0.85, priority: "HIGH", autoFlag: true, approvalGateOverride: "scope+approval", rationale: "Auth bypass enables testing authorization boundaries" },
  { ruleId: "SEQ-006", name: "JWT Bypass → IDOR Vertical", trigger: { vectorKey: "auth-jwt-none", status: "CONFIRMED", requiresVector: "idor-horizontal" }, targetVectors: ["idor-vertical"], confidence: 0.9, priority: "CRITICAL", autoFlag: true, approvalGateOverride: "human_approval", rationale: "Auth bypass + broken object-level auth suggests role-based auth may also be broken" },
  { ruleId: "SEQ-007", name: "SQLi Classic → SQLi Blind", trigger: { vectorKey: "sqli-classic", status: "CONFIRMED" }, targetVectors: ["sqli-blind"], confidence: 0.75, priority: "HIGH", autoFlag: true, approvalGateOverride: "scope+approval", rationale: "Same injection point may have blind variant; other endpoints likely vulnerable too" },
  { ruleId: "SEQ-008", name: "SQLi → SSRF Internal", trigger: { vectorKey: "sqli-classic", status: "CONFIRMED", evidenceCondition: { field: "database_version", operator: "contains", value: "MySQL" } }, targetVectors: ["ssrf-internal"], confidence: 0.7, priority: "HIGH", autoFlag: false, approvalGateOverride: "human_approval", rationale: "MySQL load_file() can read internal files; MSSQL xp_cmdshell can make network requests" },
  { ruleId: "SEQ-009", name: "XXE OOB → SSRF Internal", trigger: { vectorKey: "xxe-out-of-band", status: "CONFIRMED" }, targetVectors: ["ssrf-internal"], confidence: 0.9, priority: "CRITICAL", autoFlag: true, approvalGateOverride: "human_approval", rationale: "XXE is fundamentally an SSRF vector through XML parser" },
  { ruleId: "SEQ-010", name: "SSTI → RCE", trigger: { vectorKey: "ssti-server-side", status: "CONFIRMED", evidenceCondition: { field: "code_execution_proof", operator: "is_not_null" } }, targetVectors: ["rce-command-injection"], confidence: 0.95, priority: "CRITICAL", autoFlag: true, approvalGateOverride: "human_approval", rationale: "SSTI with code execution is essentially RCE; escalate to full command injection testing" },
  { ruleId: "SEQ-011", name: "Host Header → Password Reset Poisoning", trigger: { vectorKey: "host-header-injection", status: "CONFIRMED", evidenceCondition: { field: "affected_functionality", operator: "contains", value: "password reset" } }, targetVectors: ["auth-password-reset-poisoning"], confidence: 0.95, priority: "CRITICAL", autoFlag: true, approvalGateOverride: "human_approval", rationale: "Host header controlling password reset URL generation is direct account takeover path" },
  { ruleId: "SEQ-012", name: "GraphQL Introspection → Batching", trigger: { vectorKey: "graphql-introspection-abuse", status: "CONFIRMED" }, targetVectors: ["graphql-batching"], confidence: 0.8, priority: "HIGH", autoFlag: true, approvalGateOverride: "scope+approval", rationale: "GraphQL servers with introspection often have batching enabled too" },
  { ruleId: "SEQ-013", name: "GraphQL Batching → IDOR", trigger: { vectorKey: "graphql-batching", status: "CONFIRMED" }, targetVectors: ["idor-horizontal"], confidence: 0.85, priority: "HIGH", autoFlag: true, approvalGateOverride: "scope+approval", rationale: "Batching allows mass object reference manipulation" },
  { ruleId: "SEQ-014", name: "Supply Chain Secrets → OAuth Misconfig", trigger: { vectorKey: "supply-chain-secrets", status: "CONFIRMED", evidenceCondition: { field: "secret_type", operator: "in", value: ["oauth_client_secret", "api_key", "jwt_secret"] } }, targetVectors: ["auth-oauth-misconfig"], confidence: 0.75, priority: "HIGH", autoFlag: false, approvalGateOverride: "scope+approval", rationale: "Leaked OAuth secrets enable redirect_uri manipulation and token theft" },
  { ruleId: "SEQ-015", name: "CORS Misconfig → Session Fixation", trigger: { vectorKey: "infra-cors-misconfig", status: "CONFIRMED", evidenceCondition: { field: "aca_credentials_response", operator: "equals", value: "true" } }, targetVectors: ["auth-session-fixation"], confidence: 0.7, priority: "MEDIUM", autoFlag: false, approvalGateOverride: "auto-run", rationale: "CORS with credentials allows cross-origin session manipulation" },
  { ruleId: "SEQ-016", name: "CRLF Injection → Cache Poisoning", trigger: { vectorKey: "infra-crlf-injection", status: "CONFIRMED" }, targetVectors: ["cache-poisoning"], confidence: 0.85, priority: "HIGH", autoFlag: true, approvalGateOverride: "scope+approval", rationale: "Injected headers via CRLF can be cached and served to other users" },
  { ruleId: "SEQ-017", name: "Cache Poisoning → XSS Stored", trigger: { vectorKey: "cache-poisoning", status: "CONFIRMED" }, targetVectors: ["xss-stored"], confidence: 0.9, priority: "HIGH", autoFlag: true, approvalGateOverride: "scope+approval", rationale: "Cache poisoning turns reflected XSS into stored XSS for all cache users" },
  { ruleId: "SEQ-018", name: "XSS Reflected → XSS Stored", trigger: { vectorKey: "xss-reflected", status: "CONFIRMED" }, targetVectors: ["xss-stored"], confidence: 0.75, priority: "HIGH", autoFlag: false, approvalGateOverride: "scope+approval", rationale: "Same sanitization weakness often affects stored contexts" },
  { ruleId: "SEQ-019", name: "XSS Stored → CSRF Bypass", trigger: { vectorKey: "xss-stored", status: "CONFIRMED" }, targetVectors: ["csrf-bypass"], confidence: 0.8, priority: "MEDIUM", autoFlag: false, approvalGateOverride: "auto-run", rationale: "XSS on same origin can make authenticated requests bypassing CSRF tokens" },
  { ruleId: "SEQ-020", name: "Mass Assignment → IDOR Vertical", trigger: { vectorKey: "api-mass-assignment", status: "CONFIRMED", evidenceCondition: { field: "extra_parameters", operator: "contains", value: "role" } }, targetVectors: ["idor-vertical"], confidence: 0.9, priority: "CRITICAL", autoFlag: true, approvalGateOverride: "human_approval", rationale: "Role parameter in mass assignment is direct path to admin access" },
  { ruleId: "SEQ-021", name: "Deserialization → RCE", trigger: { vectorKey: "deserialization-insecure", status: "CONFIRMED" }, targetVectors: ["rce-command-injection"], confidence: 0.95, priority: "CRITICAL", autoFlag: true, approvalGateOverride: "human_approval", rationale: "Deserialization with gadget chain executes arbitrary code = RCE" },
  { ruleId: "SEQ-022", name: "File Upload → RCE", trigger: { vectorKey: "file-upload-abuse", status: "CONFIRMED", evidenceCondition: { field: "execution_proof", operator: "is_not_null" } }, targetVectors: ["rce-command-injection"], confidence: 0.95, priority: "CRITICAL", autoFlag: true, approvalGateOverride: "human_approval", rationale: "Uploaded executable file with execution proof = server compromise" },
  { ruleId: "SEQ-023", name: "Path Traversal → Source Code Disclosure", trigger: { vectorKey: "path-traversal-lfi", status: "CONFIRMED" }, targetVectors: ["info-sourcemap", "supply-chain-secrets"], confidence: 0.8, priority: "HIGH", autoFlag: false, approvalGateOverride: "scope+approval", rationale: "LFI reading source files may expose credentials and internal paths" },
  { ruleId: "SEQ-024", name: "Info Stack Trace → SQLi", trigger: { vectorKey: "info-stack-trace", status: "CONFIRMED", evidenceCondition: { field: "database_queries", operator: "is_not_null" } }, targetVectors: ["sqli-classic"], confidence: 0.75, priority: "HIGH", autoFlag: true, approvalGateOverride: "scope+approval", rationale: "SQL in stack trace = direct hint for SQL injection testing" },
  { ruleId: "SEQ-025", name: "Info Stack Trace → SSTI", trigger: { vectorKey: "info-stack-trace", status: "CONFIRMED", evidenceCondition: { field: "library_versions", operator: "contains_any", value: ["Jinja2", "Twig", "Velocity", "Freemarker"] } }, targetVectors: ["ssti-server-side"], confidence: 0.7, priority: "HIGH", autoFlag: true, approvalGateOverride: "scope+approval", rationale: "Template engine in stack trace = SSTI target identified" },
  { ruleId: "SEQ-026", name: "Source Map → Secrets", trigger: { vectorKey: "info-sourcemap", status: "CONFIRMED", evidenceCondition: { field: "secrets_found", operator: "is_not_null" } }, targetVectors: ["supply-chain-secrets"], confidence: 0.85, priority: "HIGH", autoFlag: true, approvalGateOverride: "scope+approval", rationale: "Source maps often contain hardcoded API keys and endpoints" },
  { ruleId: "SEQ-027", name: "Mobile Secrets → Cloud IAM", trigger: { vectorKey: "mobile-hardcoded-secrets", status: "CONFIRMED", evidenceCondition: { field: "secret_type", operator: "in", value: ["aws_access_key", "gcp_api_key", "azure_key"] } }, targetVectors: ["cloud-iam-overpermission"], confidence: 0.8, priority: "HIGH", autoFlag: false, approvalGateOverride: "scope+approval", rationale: "Cloud credentials in mobile app = direct cloud access for attacker" },
  { ruleId: "SEQ-028", name: "WebSocket Hijack → IDOR", trigger: { vectorKey: "websocket-hijack", status: "CONFIRMED" }, targetVectors: ["idor-horizontal", "idor-vertical"], confidence: 0.8, priority: "HIGH", autoFlag: true, approvalGateOverride: "scope+approval", rationale: "Missing WebSocket auth often correlates with missing REST auth" },
  { ruleId: "SEQ-029", name: "Open Redirect → OAuth Misconfig", trigger: { vectorKey: "open-redirect", status: "CONFIRMED" }, targetVectors: ["auth-oauth-misconfig"], confidence: 0.8, priority: "HIGH", autoFlag: false, approvalGateOverride: "scope+approval", rationale: "Open redirect on same domain can abuse OAuth redirect_uri validation" },
  { ruleId: "SEQ-030", name: "Subdomain Takeover → XSS Stored", trigger: { vectorKey: "subdomain-takeover", status: "CONFIRMED" }, targetVectors: ["xss-stored"], confidence: 0.7, priority: "HIGH", autoFlag: false, approvalGateOverride: "scope+approval", rationale: "Subdomain takeover enables trusted-domain XSS and phishing" },
  // TODO: SEQ-031..SEQ-037 belum tersedia dari sumber Appendix E — susulkan saat naskah lengkap didapat.
];

// ─── 10 COMPOUND RULES ───

export const COMPOUND_RULES: CompoundRule[] = [
  { ruleId: "COMP-001", name: "Horizontal IDOR + Mass Assignment → Vertical IDOR", triggerVectors: ["idor-horizontal", "api-mass-assignment"], triggerStatus: ["CONFIRMED", "CONFIRMED"], targetVectors: ["idor-vertical"], confidence: 0.92, priority: "CRITICAL", autoFlag: true, approvalGateOverride: "human_approval", rationale: "Broken object access + field modification = privilege escalation vector" },
  { ruleId: "COMP-002", name: "JWT Bypass + Horizontal IDOR → Account Takeover", triggerVectors: ["auth-jwt-none", "idor-horizontal"], triggerStatus: ["CONFIRMED", "CONFIRMED"], targetVectors: ["idor-vertical", "auth-password-reset-poisoning"], confidence: 0.95, priority: "CRITICAL", autoFlag: true, approvalGateOverride: "human_approval", rationale: "This combination is a complete authentication/authorization breakdown" },
  { ruleId: "COMP-003", name: "SSRF + Cloud Metadata + IAM → Complete Cloud Compromise", triggerVectors: ["ssrf-internal", "cloud-metadata-exposure", "cloud-iam-overpermission"], triggerStatus: ["CONFIRMED", "CONFIRMED", "CONFIRMED"], targetVectors: ["cloud-s3-public"], confidence: 0.98, priority: "CRITICAL", autoFlag: true, approvalGateOverride: "human_approval", rationale: "This chain represents complete cloud environment compromise", reportSeverityOverride: "CRITICAL", reportTitleTemplate: "Complete Cloud Account Takeover via SSRF → Metadata → IAM Escalation" },
  { ruleId: "COMP-004", name: "SQLi + Stack Trace → Database Compromise", triggerVectors: ["sqli-classic", "info-stack-trace"], triggerStatus: ["CONFIRMED", "CONFIRMED"], targetVectors: ["sqli-blind"], confidence: 0.9, priority: "CRITICAL", autoFlag: true, approvalGateOverride: "human_approval", rationale: "Verbose SQL errors + confirmed injection = easy database enumeration" },
  { ruleId: "COMP-005", name: "XSS Stored + CORS Credentials → Session Hijacking at Scale", triggerVectors: ["xss-stored", "infra-cors-misconfig"], triggerStatus: ["CONFIRMED", "CONFIRMED"], targetVectors: ["auth-session-fixation"], confidence: 0.88, priority: "CRITICAL", autoFlag: true, approvalGateOverride: "human_approval", rationale: "CORS with credentials allows XSS to read authenticated responses from API" },
  { ruleId: "COMP-006", name: "GraphQL Introspection + Batching → Mass Data Exfiltration", triggerVectors: ["graphql-introspection-abuse", "graphql-batching"], triggerStatus: ["CONFIRMED", "CONFIRMED"], targetVectors: ["idor-horizontal"], confidence: 0.9, priority: "CRITICAL", autoFlag: true, approvalGateOverride: "human_approval", rationale: "Introspection reveals schema; batching bypasses rate limits for mass extraction" },
  { ruleId: "COMP-007", name: "Cache Poisoning + CRLF → Stored XSS in Cache", triggerVectors: ["cache-poisoning", "infra-crlf-injection"], triggerStatus: ["CONFIRMED", "CONFIRMED"], targetVectors: ["xss-stored"], confidence: 0.92, priority: "CRITICAL", autoFlag: true, approvalGateOverride: "human_approval", rationale: "CRLF-injected XSS payload cached = stored XSS affecting all cache users" },
  { ruleId: "COMP-008", name: "Source Map + Dependency CVE → Known Exploit Path", triggerVectors: ["info-sourcemap", "supply-chain-dependency-cve"], triggerStatus: ["CONFIRMED", "CONFIRMED"], targetVectors: ["sqli-classic", "xss-stored", "ssti-server-side"], confidence: 0.85, priority: "HIGH", autoFlag: false, approvalGateOverride: "scope+approval", rationale: "Version confirmation from source map + known CVE = high-confidence exploit" },
  { ruleId: "COMP-009", name: "Mobile Secrets + OAuth Misconfig → Account Takeover", triggerVectors: ["mobile-hardcoded-secrets", "auth-oauth-misconfig"], triggerStatus: ["CONFIRMED", "CONFIRMED"], targetVectors: ["auth-password-reset-poisoning"], confidence: 0.85, priority: "CRITICAL", autoFlag: false, approvalGateOverride: "human_approval", rationale: "Client secret enables malicious app to perform OAuth flow abuse" },
  { ruleId: "COMP-010", name: "Race Condition + Mass Assignment → Double Privilege Escalation", triggerVectors: ["race-condition", "api-mass-assignment"], triggerStatus: ["CONFIRMED", "CONFIRMED"], targetVectors: ["idor-vertical"], confidence: 0.88, priority: "CRITICAL", autoFlag: true, approvalGateOverride: "human_approval", rationale: "Concurrent role assignment race + field injection = reliable privilege escalation" },
];

// ─── 4 CATEGORY ESCALATION RULES ───

export const CATEGORY_ESCALATION_RULES: CategoryEscalationRule[] = [
  { ruleId: "CAT-001", name: "Injection Cluster Escalation", triggerCategory: "Injection", triggerCount: 2, triggerStatus: "CONFIRMED", action: "escalate_approval_gate", targetCategory: "Injection", newApprovalGate: "human_approval", rationale: "Multiple injection flaws suggest systemic sanitization failure" },
  { ruleId: "CAT-002", name: "Auth Cluster Escalation", triggerCategory: "Authentication", triggerCount: 2, triggerStatus: "CONFIRMED", action: "escalate_priority", targetCategory: "Authentication", newPriority: "CRITICAL", rationale: "Multiple auth flaws suggest broken authentication architecture" },
  { ruleId: "CAT-003", name: "Cloud Chain Auto-Trigger", triggerCategory: "Cloud", triggerCount: 1, triggerStatus: "CONFIRMED", action: "auto_flag_all_in_category", targetCategory: "Cloud", rationale: "Cloud flaws often chain together; one finding suggests others" },
  { ruleId: "CAT-004", name: "Supply Chain Cascade", triggerCategory: "Supply Chain", triggerCount: 1, triggerStatus: "CONFIRMED", action: "auto_flag_related", targetVectors: ["supply-chain-dependency-cve"], rationale: "Compromised repo likely has other security issues" },
];

// ─── 3 PREREQUISITE SATISFACTION RULES ───

export const PREREQUISITE_RULES: PrerequisiteRule[] = [
  { ruleId: "PRE-001", name: "Auto-satisfy SSRF prerequisites from XXE", sourceVector: "xxe-out-of-band", targetVector: "ssrf-internal", prerequisiteSatisfied: "Server memiliki akses ke internal network atau cloud metadata", autoUpdate: true },
  { ruleId: "PRE-002", name: "Auto-satisfy JWT prerequisites from source code", sourceVector: "info-sourcemap", targetVector: "auth-jwt-alg-confusion", prerequisiteSatisfied: "Public key dapat diakses (JWKS endpoint, cert, atau source code)", autoUpdate: true },
  { ruleId: "PRE-003", name: "Auto-satisfy Deserialization prerequisites from Stack Trace", sourceVector: "info-stack-trace", targetVector: "deserialization-insecure", prerequisiteSatisfied: "Gadget chain tersedia untuk RCE (ysoserial, pickle gadgets)", autoUpdate: false, note: "Requires manual gadget chain analysis but framework version is known" },
];

export const SCORING: ScoringMatrix = {
  confidenceWeights: {
    direct_evidence_match: 1.0,
    prerequisite_satisfaction: 0.9,
    category_pattern: 0.7,
    historical_correlation: 0.6,
  },
  priorityMatrix: {
    CRITICAL: { minConfidence: 0.9, autoFlag: true, approvalGate: "human_approval" },
    HIGH: { minConfidence: 0.8, autoFlag: true, approvalGate: "scope+approval" },
    MEDIUM: { minConfidence: 0.65, autoFlag: false, approvalGate: "auto-run" },
    LOW: { minConfidence: 0.5, autoFlag: false, approvalGate: "auto-run" },
  },
};

export function getSequentialRules(): SequentialRule[] { return SEQUENTIAL_RULES; }
export function getCompoundRules(): CompoundRule[] { return COMPOUND_RULES; }
export function getCategoryEscalationRules(): CategoryEscalationRule[] { return CATEGORY_ESCALATION_RULES; }
export function getPrerequisiteRules(): PrerequisiteRule[] { return PREREQUISITE_RULES; }
export function getScoringMatrix(): ScoringMatrix { return SCORING; }
