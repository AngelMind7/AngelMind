import { describe, expect, it } from "vitest";
import {
  canExecuteTool,
  getToolCatalogSummary,
  listToolCatalog,
  toolCatalog,
} from "./tool-catalog";

const verifiedRuntimeKeys = new Set([
  "burp_suite_pro", "jwt_tool", "dalfox", "ssrfmap", "interactsh",
  "ffuf", "cloudfox", "secrets_detection.1", "graphql_cop", "sqlmap",
  "nuclei", "asset_intelligence.28", "httpx", "dependencies.12", "custom_scripts",
]);

describe("tool catalog safety boundary", () => {
  it("loads the complete 15-tool catalog with all adapters verified and enabled", () => {
    expect(toolCatalog).toHaveLength(15);
    expect(
      toolCatalog.filter(tool => tool.enabledByDefault).map(tool => tool.toolKey).sort()
    ).toEqual([...verifiedRuntimeKeys].sort());
    expect(toolCatalog.every(tool => tool.verificationStatus === "verified")).toBe(true);
  });

  it("matches manifest risk totals", () => {
    const summary = getToolCatalogSummary();
    expect(summary.total).toBe(15);
    expect(summary.byRisk).toEqual({ low: 4, medium: 6, high: 4, critical: 1 });
  });

  it("exposes actual category totals", () => {
    const summary = getToolCatalogSummary();
    expect(summary.byCategory).toEqual({
      "Web Application Testing": 1,
      "Authentication": 1,
      "Injection": 2,
      "Network": 2,
      "Discovery": 4,
      "Cloud": 1,
      "Supply Chain": 2,
      "API": 1,
      "Fallback": 1,
    });
  });

  it("keeps every tool verified, enabled, and safely dispositioned", () => {
    for (const tool of toolCatalog) {
      expect(tool.verificationStatus).toBe("verified");
      expect(tool.enabledByDefault).toBe(true);
      expect(["candidate_passive_review", "candidate_offline_or_artifact"]).toContain(tool.disposition);
    }
  });

  it("filters candidate classes correctly", () => {
    expect(listToolCatalog({ disposition: "candidate_offline_or_artifact" })).toHaveLength(2);
    expect(listToolCatalog({ disposition: "candidate_passive_review" })).toHaveLength(13);
  });

  it("allows low-risk offline tools in offline_artifact mode", () => {
    for (const toolKey of ["secrets_detection.1", "dependencies.12"]) {
      expect(
        canExecuteTool({ toolKey, mode: "offline_artifact", scopeValidated: true, humanApproval: false }).allowed
      ).toBe(true);
    }
  });

  it("allows low-risk passive tools in passive_readonly mode", () => {
    for (const toolKey of ["asset_intelligence.28", "httpx"]) {
      expect(
        canExecuteTool({ toolKey, mode: "passive_readonly", scopeValidated: true, humanApproval: false }).allowed
      ).toBe(true);
    }
  });

  it("requires human approval and active mode for high-risk tools", () => {
    for (const toolKey of ["jwt_tool", "dalfox", "ssrfmap", "custom_scripts"]) {
      expect(
        canExecuteTool({ toolKey, mode: "passive_readonly", scopeValidated: true, humanApproval: false }).allowed
      ).toBe(false);
      expect(
        canExecuteTool({ toolKey, mode: "active_nondestructive", scopeValidated: true, humanApproval: true }).allowed
      ).toBe(true);
    }
  });

  it("requires privileged_or_destructive mode and approval for critical tools", () => {
    expect(
      canExecuteTool({ toolKey: "sqlmap", mode: "active_nondestructive", scopeValidated: true, humanApproval: false }).allowed
    ).toBe(false);
    expect(
      canExecuteTool({ toolKey: "sqlmap", mode: "privileged_or_destructive", scopeValidated: true, humanApproval: true }).allowed
    ).toBe(true);
  });

  it("rejects unscoped or unknown tool keys", () => {
    expect(
      canExecuteTool({ toolKey: "missing.1", mode: "passive_readonly", scopeValidated: true, humanApproval: true })
    ).toEqual({ allowed: false, reason: "tool_not_found" });
    expect(
      canExecuteTool({ toolKey: "httpx", mode: "passive_readonly", scopeValidated: false, humanApproval: true })
    ).toEqual({ allowed: false, reason: "scope_not_validated" });
  });
});
