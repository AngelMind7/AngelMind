import { canonicalToolKey, getToolCatalogEntry } from "./tool-catalog";

export type MasterCapability = {
  capability: string;
  primaryAdapter: string;
  fallbackAdapter?: string;
};

/** Canonical capability routing from the master specification. */
export const masterCapabilityRegistry: readonly MasterCapability[] = [
  { capability: "jwt-analysis", primaryAdapter: "jwt_tool", fallbackAdapter: "burp_suite_pro" },
  { capability: "token-manipulation", primaryAdapter: "jwt_tool", fallbackAdapter: "burp_suite_pro" },
  { capability: "crypto-testing", primaryAdapter: "jwt_tool", fallbackAdapter: "burp_suite_pro" },
  { capability: "sql-injection-testing", primaryAdapter: "sqlmap", fallbackAdapter: "burp_suite_pro" },
  { capability: "ssrf-testing", primaryAdapter: "ssrfmap", fallbackAdapter: "burp_suite_pro" },
  { capability: "graphql-introspection", primaryAdapter: "graphql_cop", fallbackAdapter: "burp_suite_pro" },
  { capability: "graphql-batching-testing", primaryAdapter: "graphql_cop", fallbackAdapter: "burp_suite_pro" },
  { capability: "secret-detection", primaryAdapter: "gitleaks" },
  { capability: "cloud-metadata-testing", primaryAdapter: "cloudfox", fallbackAdapter: "ssrfmap" },
  { capability: "iam-analysis", primaryAdapter: "cloudfox" },
  { capability: "dependency-scanning", primaryAdapter: "trivy" },
  { capability: "dns-enumeration", primaryAdapter: "subfinder" },
  { capability: "cve-scanning", primaryAdapter: "nuclei" },
  { capability: "parameter-manipulation", primaryAdapter: "ffuf", fallbackAdapter: "burp_suite_pro" },
  { capability: "template-injection-testing", primaryAdapter: "custom_scripts" },
  { capability: "file-upload-testing", primaryAdapter: "burp_suite_pro", fallbackAdapter: "custom_scripts" },
];

export function resolveCapability(capability: string) {
  const entry = masterCapabilityRegistry.find(item => item.capability === capability);
  if (!entry) return undefined;
  const adapters = [entry.primaryAdapter, entry.fallbackAdapter]
    .filter((value): value is string => Boolean(value))
    .map(toolKey => ({ toolKey: canonicalToolKey(toolKey), available: Boolean(getToolCatalogEntry(toolKey)) }));
  return { ...entry, adapters };
}

export function listOperationalMasterCapabilities() {
  return masterCapabilityRegistry.filter(item => getToolCatalogEntry(item.primaryAdapter));
}
