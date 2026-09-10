import { describe, expect, it } from "vitest";
import { resolveCanonicalTool } from "./canonical-tool-runtime";

describe("canonical tool runtime identity", () => {
  it("resolves canonical IDs to explicit runtime aliases", () => {
    expect(resolveCanonicalTool("burp_pro")).toEqual({
      toolId: "burp_pro",
      runtimeToolKey: "burp_suite_pro",
    });
    expect(resolveCanonicalTool("gitleaks")).toEqual({
      toolId: "gitleaks",
      runtimeToolKey: "secrets_detection.1",
    });
    expect(resolveCanonicalTool("subfinder")).toEqual({
      toolId: "subfinder",
      runtimeToolKey: "asset_intelligence.28",
    });
    expect(resolveCanonicalTool("trivy")).toEqual({
      toolId: "trivy",
      runtimeToolKey: "dependencies.12",
    });
  });

  it("does not infer unknown identities", () => {
    expect(resolveCanonicalTool("sqlmap-bypass")).toBeUndefined();
  });
});
