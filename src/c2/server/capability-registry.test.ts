import { describe, expect, it } from "vitest";
import {
  assertKnownCapability,
  getCapabilityDefinition,
  listCapabilities,
  selectAdapter,
} from "./capability-registry";

describe("canonical capability registry", () => {
  it("contains all master capabilities", () => {
    expect(listCapabilities()).toHaveLength(16);
    expect(getCapabilityDefinition("gitleaks")).toBeUndefined();
    expect(getCapabilityDefinition("secret-detection")?.primaryAdapter).toBe("gitleaks_adapter");
    expect(getCapabilityDefinition("dependency-scanning")?.primaryAdapter).toBe("trivy_adapter");
    expect(getCapabilityDefinition("dns-enumeration")?.primaryAdapter).toBe("subfinder_adapter");
  });

  it("prefers primary and falls back deterministically", () => {
    expect(selectAdapter("sql-injection-testing", ["burp_pro_adapter", "sqlmap_adapter"])).toBe("sqlmap_adapter");
    expect(selectAdapter("sql-injection-testing", ["burp_pro_adapter"])).toBe("burp_pro_adapter");
    expect(selectAdapter("iam-analysis", ["burp_pro_adapter"])).toBeUndefined();
  });

  it("rejects unknown capabilities", () => {
    expect(() => assertKnownCapability("not-a-capability")).toThrow("Unknown capability");
    expect(() => assertKnownCapability("secret-detection")).not.toThrow();
  });
});
