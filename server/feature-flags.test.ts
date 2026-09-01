import { describe, expect, it } from "vitest";
import { isFeatureEnabled, parseFeatureFlags, requireFeature } from "./feature-flags";

describe("feature flags", () => {
  const config = parseFeatureFlags(JSON.stringify({
    graph_v2: { enabled: true, environments: ["staging"] },
    pilot: { enabled: true, allowOrganizations: [42] },
    disabled: { enabled: false },
    everyone: { enabled: true, rolloutPercentage: 100 },
  }));

  it("enforces environment and explicit kill switches", () => {
    expect(isFeatureEnabled({ flag: "graph_v2", environment: "staging", config })).toBe(true);
    expect(isFeatureEnabled({ flag: "graph_v2", environment: "production", config })).toBe(false);
    expect(isFeatureEnabled({ flag: "disabled", environment: "staging", config })).toBe(false);
  });

  it("supports tenant allowlists and deterministic full rollout", () => {
    expect(isFeatureEnabled({ flag: "pilot", environment: "staging", organizationId: 42, config })).toBe(true);
    expect(isFeatureEnabled({ flag: "pilot", environment: "staging", organizationId: 7, config })).toBe(false);
    expect(isFeatureEnabled({ flag: "everyone", environment: "production", userId: 7, config })).toBe(true);
  });

  it("fails closed for malformed configuration and disabled features", () => {
    expect(() => parseFeatureFlags("not-json")).toThrow();
    expect(() => parseFeatureFlags(JSON.stringify({ "bad flag": { enabled: true } }))).toThrow();
    expect(() => parseFeatureFlags(JSON.stringify({ invalid: { enabled: "true" } }))).toThrow();
    expect(() => parseFeatureFlags(JSON.stringify({ invalid: { enabled: true, rolloutPercentage: 101 } }))).toThrow();
    expect(() => requireFeature({ flag: "disabled", environment: "staging", config })).toThrow("Feature is not enabled");
  });
});
