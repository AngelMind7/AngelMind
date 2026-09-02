import type { SelectedResearchVector } from "./research-vector-selection";

/**
 * P4 — Tambahan vector fingerprint menuju 45 vectors (Appendix F, Master Spec v4).
 *
 * File terpisah dari research-vector-selection.ts supaya tidak mengubah/berisiko
 * merusak 13 rule yang sudah ada & sudah punya test (research-vector-selection.test.ts).
 * Digabung lewat merge di research-vector-selection.ts (lihat patch di bawah).
 *
 * Naming SENGAJA mengikuti konvensi file asli: vectorKey (bukan vector_id),
 * camelCase field, riskClass union yang sama ("low"|"medium"|"high"|"critical").
 */

export const extraFingerprintRules: Array<{
  needles: string[];
  vectors: Array<Omit<SelectedResearchVector, "rationale"> & { rationale: string }>;
}> = [
  { needles: ["blind sql", "time-based", "boolean-based"], vectors: [
    { vectorKey: "sqli-blind", capability: "sql-injection-testing", suggestedAdapters: ["sqlmap_adapter", "burp_pro_adapter"], riskClass: "high", rationale: "Indikator SQLi blind (time/boolean-based) ditemukan pada metadata asset." },
  ] },
  { needles: ["deserialize", "pickle", "java serialized", "unserialize"], vectors: [
    { vectorKey: "deserialization-insecure", capability: "deserialization-testing", suggestedAdapters: ["custom_scripts_adapter"], riskClass: "critical", rationale: "Indikator deserialisasi tidak aman ditemukan; vector dibatasi approval." },
  ] },
  { needles: ["solidity", "smart contract", ".sol"], vectors: [
    { vectorKey: "blockchain-reentrancy", capability: "solidity-analysis", suggestedAdapters: ["custom_scripts_adapter"], riskClass: "critical", rationale: "Smart contract Solidity ditemukan; berpotensi reentrancy, dibatasi approval." },
    { vectorKey: "blockchain-access-control", capability: "solidity-analysis", suggestedAdapters: ["custom_scripts_adapter"], riskClass: "critical", rationale: "Smart contract Solidity ditemukan; berpotensi access-control bypass, dibatasi approval." },
  ] },
  { needles: ["cache-control", "cdn", "x-cache"], vectors: [
    { vectorKey: "cache-poisoning", capability: "cache-behavior-analysis", suggestedAdapters: ["burp_pro_adapter"], riskClass: "high", rationale: "Cache header ditemukan pada metadata asset; berpotensi cache poisoning." },
  ] },
  { needles: ["mass assignment", "extra parameter", "auto-bind"], vectors: [
    { vectorKey: "api-mass-assignment", capability: "parameter-manipulation", suggestedAdapters: ["burp_pro_adapter"], riskClass: "high", rationale: "Pola parameter-based routing/binding ditemukan; berpotensi mass assignment." },
  ] },
  { needles: ["idor", "object reference", "sequential id"], vectors: [
    { vectorKey: "idor-horizontal", capability: "authorization-testing", suggestedAdapters: ["burp_pro_adapter"], riskClass: "high", rationale: "Pola parameter object reference ditemukan; berpotensi IDOR horizontal." },
    { vectorKey: "idor-vertical", capability: "authorization-testing", suggestedAdapters: ["burp_pro_adapter"], riskClass: "critical", rationale: "Pola parameter object reference ditemukan; berpotensi IDOR vertikal (privilege escalation)." },
  ] },
  { needles: ["stack trace", "debug=true", "verbose error"], vectors: [
    { vectorKey: "info-stack-trace", capability: "error-analysis", suggestedAdapters: ["custom_scripts_adapter"], riskClass: "medium", rationale: "Stack trace / error verbose ditemukan pada respons." },
  ] },
  { needles: ["apk", "ipa", "mobile app"], vectors: [
    { vectorKey: "mobile-hardcoded-secrets", capability: "mobile-reverse-engineering", suggestedAdapters: ["custom_scripts_adapter"], riskClass: "medium", rationale: "Aplikasi mobile (APK/IPA) ditemukan; berpotensi hardcoded secret." },
    { vectorKey: "mobile-deep-link-hijack", capability: "mobile-reverse-engineering", suggestedAdapters: ["custom_scripts_adapter"], riskClass: "medium", rationale: "Aplikasi mobile (APK/IPA) ditemukan; berpotensi deep-link hijack." },
  ] },
  { needles: ["subdomain", "cname", "dangling dns"], vectors: [
    { vectorKey: "subdomain-takeover", capability: "domain-validation-testing", suggestedAdapters: ["custom_scripts_adapter"], riskClass: "high", rationale: "Indikator CNAME/dangling DNS ditemukan; berpotensi subdomain takeover." },
  ] },
  { needles: ["redirect=", "return_to", "next=", "url="], vectors: [
    { vectorKey: "open-redirect", capability: "redirect-manipulation", suggestedAdapters: ["custom_scripts_adapter"], riskClass: "low", rationale: "Parameter redirect ditemukan; berpotensi open redirect." },
  ] },
  { needles: ["no csrf", "missing csrf", "samesite=none"], vectors: [
    { vectorKey: "csrf-bypass", capability: "csrf-testing", suggestedAdapters: ["burp_pro_adapter"], riskClass: "medium", rationale: "Indikator proteksi CSRF lemah/absen ditemukan." },
  ] },
  { needles: ["race condition", "concurrent request", "toctou"], vectors: [
    { vectorKey: "race-condition", capability: "timing-analysis", suggestedAdapters: ["custom_scripts_adapter"], riskClass: "high", rationale: "Indikator operasi non-atomic ditemukan; berpotensi race condition." },
  ] },
  { needles: ["dependency", "package.json", "requirements.txt", "cve"], vectors: [
    { vectorKey: "supply-chain-dependency-cve", capability: "dependency-scanning", suggestedAdapters: ["dependencies.12"], riskClass: "high", rationale: "Manifest dependency ditemukan; perlu pemeriksaan CVE." },
  ] },
  { needles: ["reflected", "xss", "unescaped output"], vectors: [
    { vectorKey: "xss-reflected", capability: "input-validation-testing", suggestedAdapters: ["dalfox_adapter", "burp_pro_adapter"], riskClass: "medium", rationale: "Indikator output tidak di-escape ditemukan; berpotensi XSS reflected." },
    { vectorKey: "xss-stored", capability: "stored-payload-testing", suggestedAdapters: ["dalfox_adapter", "burp_pro_adapter"], riskClass: "high", rationale: "Indikator output tidak di-escape pada konten tersimpan; berpotensi XSS stored." },
  ] },
  { needles: ["path traversal", "..%2f", "lfi", "../"], vectors: [
    { vectorKey: "path-traversal-lfi", capability: "file-read-validation", suggestedAdapters: ["custom_scripts_adapter"], riskClass: "high", rationale: "Indikator path traversal / LFI ditemukan pada parameter." },
  ] },
  { needles: ["crlf", "header injection", "%0d%0a"], vectors: [
    { vectorKey: "infra-crlf-injection", capability: "header-manipulation", suggestedAdapters: ["burp_pro_adapter"], riskClass: "high", rationale: "Indikator CRLF injection ditemukan pada header/parameter." },
  ] },
  { needles: ["host:", "x-forwarded-host", "host header"], vectors: [
    { vectorKey: "host-header-injection", capability: "header-manipulation", suggestedAdapters: ["burp_pro_adapter"], riskClass: "high", rationale: "Indikator Host header dapat dimanipulasi ditemukan." },
  ] },
  { needles: ["command injection", "shell=true", "os.system", "exec("], vectors: [
    { vectorKey: "rce-command-injection", capability: "code-execution-validation", suggestedAdapters: ["custom_scripts_adapter"], riskClass: "critical", rationale: "Indikator eksekusi command dari input pengguna ditemukan; dibatasi approval." },
  ] },
  { needles: ["s3.amazonaws.com", "public bucket", "acl=public"], vectors: [
    { vectorKey: "cloud-s3-public", capability: "cloud-metadata-testing", suggestedAdapters: ["cloudfox"], riskClass: "high", rationale: "Indikator S3 bucket publik ditemukan." },
  ] },
  { needles: ["iam", "assume role", "sts:"], vectors: [
    { vectorKey: "cloud-iam-overpermission", capability: "iam-analysis", suggestedAdapters: ["cloudfox_adapter"], riskClass: "critical", rationale: "Indikator IAM/assume-role ditemukan; berpotensi over-permission, dibatasi approval." },
  ] },
  { needles: ["session fixation", "session id in url", "jsessionid"], vectors: [
    { vectorKey: "auth-session-fixation", capability: "session-analysis", suggestedAdapters: ["burp_pro_adapter"], riskClass: "high", rationale: "Indikator session ID dapat difiksasi ditemukan." },
  ] },
];
