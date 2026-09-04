// 15-tool catalog — pengganti manifest PDF 556 tools lama.
// Sesuai ANGELMIND-PRO-MASTER-FINAL.md Section 6.2.
export const generatedToolCatalog = [
  {
    "toolKey": "burp_suite_pro",
    "name": "Burp Suite Professional",
    "category": "Web Application Testing",
    "riskClass": "medium",
    "approvalGate": "auto_run",
    "verificationStatus": "verified",
    "disposition": "candidate_passive_review",
    "enabledByDefault": true
  },
  {
    "toolKey": "jwt_tool",
    "name": "jwt_tool (custom wrapper)",
    "category": "Authentication",
    "riskClass": "high",
    "approvalGate": "scope_check",
    "verificationStatus": "verified",
    "disposition": "candidate_passive_review",
    "enabledByDefault": true
  },
  {
    "toolKey": "dalfox",
    "name": "Dalfox (custom polyglot)",
    "category": "Injection",
    "riskClass": "high",
    "approvalGate": "scope_check",
    "verificationStatus": "verified",
    "disposition": "candidate_passive_review",
    "enabledByDefault": true
  },
  {
    "toolKey": "ssrfmap",
    "name": "SSRFmap (custom probe)",
    "category": "Network",
    "riskClass": "high",
    "approvalGate": "scope_check",
    "verificationStatus": "verified",
    "disposition": "candidate_passive_review",
    "enabledByDefault": true
  },
  {
    "toolKey": "interactsh",
    "name": "Interactsh (custom OOB)",
    "category": "Network",
    "riskClass": "medium",
    "approvalGate": "auto_run",
    "verificationStatus": "verified",
    "disposition": "candidate_passive_review",
    "enabledByDefault": true
  },
  {
    "toolKey": "ffuf",
    "name": "ffuf (custom wordlist)",
    "category": "Discovery",
    "riskClass": "medium",
    "approvalGate": "auto_run",
    "verificationStatus": "verified",
    "disposition": "candidate_passive_review",
    "enabledByDefault": true
  },
  {
    "toolKey": "cloudfox",
    "name": "CloudFox (custom IAM mapper)",
    "category": "Cloud",
    "riskClass": "medium",
    "approvalGate": "auto_run",
    "verificationStatus": "verified",
    "disposition": "candidate_passive_review",
    "enabledByDefault": true
  },
  {
    "toolKey": "secrets_detection.1",
    "name": "Gitleaks (auto-validate)",
    "category": "Supply Chain",
    "riskClass": "low",
    "approvalGate": "auto_run",
    "verificationStatus": "verified",
    "disposition": "candidate_offline_or_artifact",
    "enabledByDefault": true
  },
  {
    "toolKey": "graphql_cop",
    "name": "graphql-cop + InQL (custom)",
    "category": "API",
    "riskClass": "medium",
    "approvalGate": "auto_run",
    "verificationStatus": "verified",
    "disposition": "candidate_passive_review",
    "enabledByDefault": true
  },
  {
    "toolKey": "sqlmap",
    "name": "sqlmap (custom tamper)",
    "category": "Injection",
    "riskClass": "critical",
    "approvalGate": "human_approval",
    "verificationStatus": "verified",
    "disposition": "candidate_passive_review",
    "enabledByDefault": true
  },
  {
    "toolKey": "nuclei",
    "name": "Nuclei (custom template)",
    "category": "Discovery",
    "riskClass": "medium",
    "approvalGate": "auto_run",
    "verificationStatus": "verified",
    "disposition": "candidate_passive_review",
    "enabledByDefault": true
  },
  {
    "toolKey": "asset_intelligence.28",
    "name": "Subfinder (custom permutation)",
    "category": "Discovery",
    "riskClass": "low",
    "approvalGate": "auto_run",
    "verificationStatus": "verified",
    "disposition": "candidate_passive_review",
    "enabledByDefault": true
  },
  {
    "toolKey": "httpx",
    "name": "httpx (custom probe)",
    "category": "Discovery",
    "riskClass": "low",
    "approvalGate": "auto_run",
    "verificationStatus": "verified",
    "disposition": "candidate_passive_review",
    "enabledByDefault": true
  },
  {
    "toolKey": "dependencies.12",
    "name": "Trivy (custom dependency)",
    "category": "Supply Chain",
    "riskClass": "low",
    "approvalGate": "auto_run",
    "verificationStatus": "verified",
    "disposition": "candidate_offline_or_artifact",
    "enabledByDefault": true
  },
  {
    "toolKey": "naabu",
    "name": "naabu (custom port profile)",
    "category": "Discovery",
    "riskClass": "low",
    "approvalGate": "auto_run",
    "verificationStatus": "verified",
    "disposition": "candidate_passive_review",
    "enabledByDefault": true
  },
  {
    "toolKey": "katana",
    "name": "katana (custom crawler)",
    "category": "Discovery",
    "riskClass": "low",
    "approvalGate": "auto_run",
    "verificationStatus": "verified",
    "disposition": "candidate_passive_review",
    "enabledByDefault": true
  },
  {
    "toolKey": "custom_scripts",
    "name": "Custom Scripts (Python/Node)",
    "category": "Fallback",
    "riskClass": "high",
    "approvalGate": "scope_check",
    "verificationStatus": "verified",
    "disposition": "candidate_passive_review",
    "enabledByDefault": true
  }
];
