export type Capability =
  | "jwt-analysis"
  | "token-manipulation"
  | "crypto-testing"
  | "sql-injection-testing"
  | "ssrf-testing"
  | "graphql-introspection"
  | "graphql-batching-testing"
  | "secret-detection"
  | "cloud-metadata-testing"
  | "iam-analysis"
  | "dependency-scanning"
  | "dns-enumeration"
  | "cve-scanning"
  | "parameter-manipulation"
  | "template-injection-testing"
  | "file-upload-testing";

export type CapabilityDefinition = {
  capability: Capability;
  primaryAdapter: string;
  fallbackAdapters: readonly string[];
};

const DEFINITIONS: readonly CapabilityDefinition[] = [
  { capability: "jwt-analysis", primaryAdapter: "jwt_tool_adapter", fallbackAdapters: ["burp_pro_adapter"] },
  { capability: "token-manipulation", primaryAdapter: "jwt_tool_adapter", fallbackAdapters: ["burp_pro_adapter"] },
  { capability: "crypto-testing", primaryAdapter: "jwt_tool_adapter", fallbackAdapters: ["burp_pro_adapter"] },
  { capability: "sql-injection-testing", primaryAdapter: "sqlmap_adapter", fallbackAdapters: ["burp_pro_adapter"] },
  { capability: "ssrf-testing", primaryAdapter: "ssrfmap_adapter", fallbackAdapters: ["burp_pro_adapter"] },
  { capability: "graphql-introspection", primaryAdapter: "graphql_cop_adapter", fallbackAdapters: ["burp_pro_adapter"] },
  { capability: "graphql-batching-testing", primaryAdapter: "graphql_cop_adapter", fallbackAdapters: ["burp_pro_adapter"] },
  { capability: "secret-detection", primaryAdapter: "gitleaks_adapter", fallbackAdapters: [] },
  { capability: "cloud-metadata-testing", primaryAdapter: "cloudfox_adapter", fallbackAdapters: ["ssrfmap_adapter"] },
  { capability: "iam-analysis", primaryAdapter: "cloudfox_adapter", fallbackAdapters: [] },
  { capability: "dependency-scanning", primaryAdapter: "trivy_adapter", fallbackAdapters: [] },
  { capability: "dns-enumeration", primaryAdapter: "subfinder_adapter", fallbackAdapters: [] },
  { capability: "cve-scanning", primaryAdapter: "nuclei_adapter", fallbackAdapters: [] },
  { capability: "parameter-manipulation", primaryAdapter: "ffuf_adapter", fallbackAdapters: ["burp_pro_adapter"] },
  { capability: "template-injection-testing", primaryAdapter: "custom_scripts_adapter", fallbackAdapters: [] },
  { capability: "file-upload-testing", primaryAdapter: "burp_pro_adapter", fallbackAdapters: ["custom_scripts_adapter"] },
] as const;

const BY_CAPABILITY = new Map(DEFINITIONS.map((definition) => [definition.capability, definition]));

export function listCapabilities(): readonly CapabilityDefinition[] {
  return DEFINITIONS;
}

export function getCapabilityDefinition(capability: string): CapabilityDefinition | undefined {
  return BY_CAPABILITY.get(capability as Capability);
}

export function selectAdapter(capability: string, availableAdapters: Iterable<string>): string | undefined {
  const definition = getCapabilityDefinition(capability);
  if (!definition) return undefined;
  const available = new Set(availableAdapters);
  if (available.has(definition.primaryAdapter)) return definition.primaryAdapter;
  return definition.fallbackAdapters.find((adapter) => available.has(adapter));
}

export function assertKnownCapability(capability: string): asserts capability is Capability {
  if (!BY_CAPABILITY.has(capability as Capability)) throw new Error(`Unknown capability: ${capability}`);
}
