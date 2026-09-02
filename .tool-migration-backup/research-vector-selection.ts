import { createHash } from "node:crypto";
import { extraFingerprintRules } from "./research-vector-selection-extra";

export type VectorRiskClass = "low" | "medium" | "high" | "critical";

export type SelectedResearchVector = {
  vectorKey: string;
  capability: string;
  suggestedAdapters: string[];
  riskClass: VectorRiskClass;
  rationale: string;
};

const fingerprintRules: Array<{
  needles: string[];
  vectors: Array<Omit<SelectedResearchVector, "rationale"> & { rationale: string }>;
}> = [
  { needles: ["jwt", "json web token"], vectors: [
    { vectorKey: "auth-jwt-alg-confusion", capability: "jwt-analysis", suggestedAdapters: ["jwt_tool_adapter"], riskClass: "high", rationale: "JWT ditemukan pada metadata asset." },
    { vectorKey: "auth-jwt-none", capability: "token-manipulation", suggestedAdapters: ["jwt_tool_adapter"], riskClass: "critical", rationale: "JWT ditemukan; pengujian algoritma none tetap memerlukan approval." },
  ] },
  { needles: ["graphql"], vectors: [{ vectorKey: "graphql-introspection-abuse", capability: "graphql-introspection", suggestedAdapters: ["graphql_cop_adapter", "inql_adapter"], riskClass: "medium", rationale: "GraphQL ditemukan pada metadata asset." }] },
  { needles: ["aws", "imds", "ec2"], vectors: [{ vectorKey: "cloud-metadata-exposure", capability: "cloud-metadata-testing", suggestedAdapters: ["cloudfox_adapter", "ssrfmap_adapter"], riskClass: "critical", rationale: "Indikator AWS/IMDS ditemukan; pengujian cloud metadata dibatasi approval." }] },
  { needles: ["oauth", "oidc"], vectors: [{ vectorKey: "auth-oauth-misconfig", capability: "oauth-flow-testing", suggestedAdapters: ["burp_pro_adapter"], riskClass: "high", rationale: "OAuth/OIDC ditemukan pada metadata asset." }] },
  { needles: ["upload", "multipart", "file upload"], vectors: [{ vectorKey: "file-upload-abuse", capability: "file-upload-testing", suggestedAdapters: ["burp_pro_adapter", "custom_scripts_adapter"], riskClass: "critical", rationale: "Fitur upload ditemukan; validasi tetap pasif sampai approval." }] },
  { needles: ["jinja", "twig", "template"], vectors: [{ vectorKey: "ssti-server-side", capability: "template-injection-testing", suggestedAdapters: ["sstimap_adapter", "tplmap_adapter"], riskClass: "critical", rationale: "Template engine ditemukan; vector berisiko tinggi dibatasi approval." }] },
  { needles: ["sql", "mysql", "postgres", "database"], vectors: [{ vectorKey: "sqli-classic", capability: "sql-injection-testing", suggestedAdapters: ["sqlmap_adapter", "burp_pro_adapter"], riskClass: "high", rationale: "Indikator database/SQL ditemukan pada metadata asset." }] },
  { needles: ["xml", "soap"], vectors: [{ vectorKey: "xxe-out-of-band", capability: "xml-injection-testing", suggestedAdapters: ["burp_pro_adapter"], riskClass: "critical", rationale: "XML parser ditemukan; vector dibatasi approval." }] },
  { needles: ["webhook", "fetch", "url parameter", "ssrf"], vectors: [{ vectorKey: "ssrf-internal", capability: "ssrf-testing", suggestedAdapters: ["ssrfmap_adapter", "burp_pro_adapter"], riskClass: "critical", rationale: "Endpoint URL-fetch ditemukan; akses internal tidak boleh dijalankan otomatis." }] },
  { needles: ["cors"], vectors: [{ vectorKey: "infra-cors-misconfig", capability: "cors-testing", suggestedAdapters: ["burp_pro_adapter"], riskClass: "medium", rationale: "CORS ditemukan pada metadata asset." }] },
  { needles: ["sourcemap", ".js.map", "minified js"], vectors: [{ vectorKey: "info-sourcemap", capability: "sourcemap-detection", suggestedAdapters: ["custom_scripts_adapter"], riskClass: "low", rationale: "Source map/minified JavaScript ditemukan." }] },
  { needles: ["websocket"], vectors: [{ vectorKey: "websocket-hijack", capability: "websocket-testing", suggestedAdapters: ["burp_pro_adapter"], riskClass: "high", rationale: "WebSocket ditemukan; pengujian memerlukan approval." }] },
  { needles: ["password reset", "reset password"], vectors: [{ vectorKey: "auth-password-reset-poisoning", capability: "header-manipulation", suggestedAdapters: ["burp_pro_adapter"], riskClass: "critical", rationale: "Password reset ditemukan; vector dibatasi approval." }] },
];

function stableKey(assetId: number, vectorKey: string) {
  return createHash("sha256").update(`${assetId}:${vectorKey}`).digest("hex").slice(0, 32);
}

export function selectVectorsForAsset(input: { assetId: number; metadata: unknown }): SelectedResearchVector[] {
  const source = typeof input.metadata === "string" ? input.metadata : JSON.stringify(input.metadata ?? {});
  const normalized = source.toLowerCase();
  const selected = [...fingerprintRules, ...extraFingerprintRules].flatMap(rule => {
    if (!rule.needles.some(needle => normalized.includes(needle))) return [];
    return rule.vectors;
  });
  const unique = new Map<string, SelectedResearchVector>();
  for (const vector of selected) {
    if (!unique.has(vector.vectorKey)) unique.set(vector.vectorKey, { ...vector, rationale: `${vector.rationale} fingerprint:${stableKey(input.assetId, vector.vectorKey)}` });
  }
  return Array.from(unique.values()).sort((a, b) => (a.riskClass === b.riskClass ? a.vectorKey.localeCompare(b.vectorKey) : riskWeight(b.riskClass) - riskWeight(a.riskClass)));
}

function riskWeight(risk: VectorRiskClass) {
  return { low: 1, medium: 2, high: 3, critical: 4 }[risk];
}

export function parseAssetMetadata(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : { raw: value };
  } catch {
    return { raw: value };
  }
}
