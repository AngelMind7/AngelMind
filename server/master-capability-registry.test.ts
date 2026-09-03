import { describe, expect, it } from "vitest";
import {
  listOperationalMasterCapabilities,
  masterCapabilityRegistry,
  resolveCapability,
} from "./master-capability-registry";

const REQUIRED_CAPABILITIES = [
  "jwt-analysis",
  "token-manipulation",
  "crypto-testing",
  "sql-injection-testing",
  "ssrf-testing",
  "graphql-introspection",
  "graphql-batching-testing",
  "secret-detection",
  "cloud-metadata-testing",
  "iam-analysis",
  "dependency-scanning",
  "dns-enumeration",
  "cve-scanning",
  "parameter-manipulation",
  "template-injection-testing",
  "file-upload-testing",
];

describe("master capability registry", () => {
  it("contains every capability required by the master specification", () => {
    expect(masterCapabilityRegistry.map(item => item.capability)).toEqual(REQUIRED_CAPABILITIES);
  });

  it("resolves canonical tool identifiers and legacy catalog aliases", () => {
    expect(resolveCapability("secret-detection")?.adapters[0]).toEqual({
      toolKey: "gitleaks",
      available: true,
    });
    expect(resolveCapability("dependency-scanning")?.adapters[0]).toEqual({
      toolKey: "trivy",
      available: true,
    });
    expect(resolveCapability("dns-enumeration")?.adapters[0]).toEqual({
      toolKey: "subfinder",
      available: true,
    });
  });

  it("does not expose a master capability whose primary adapter is absent", () => {
    expect(listOperationalMasterCapabilities()).toHaveLength(REQUIRED_CAPABILITIES.length);
  });
});
