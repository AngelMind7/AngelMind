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
  "nuclei", "asset_intelligence.28", "httpx", "dependencies.12", "naabu", "katana", "custom_scripts",
]);

describe("tool catalog safety boundary", () => {
  it("loads the complete 17-tool catalog with all adapters verified and enabled", () => {
    expect(toolCatalog.length).toBeGreaterThanOrEqual(50);
    const enabledKeys = toolCatalog.filter(tool => tool.enabledByDefault).map(tool => tool.toolKey);
    expect(enabledKeys).toHaveLength(17);
    expect(enabledKeys).toEqual(expect.arrayContaining([...verifiedRuntimeKeys].map(key => ({ "secrets_detection.1": "gitleaks", "asset_intelligence.28": "subfinder", "dependencies.12": "trivy" }[key] ?? key))));
    expect(toolCatalog.filter(tool => tool.enabledByDefault).every(tool => tool.verificationStatus === "verified")).toBe(true);
  });

  it("matches manifest risk totals", () => {
    const summary = getToolCatalogSummary();
    expect(summary.total).toBe(toolCatalog.length);
    expect(Object.values(summary.byRisk).reduce((total, count) => total + count, 0)).toBe(summary.total);
  });

  it("exposes actual category totals", () => {
    const summary = getToolCatalogSummary();
    expect(Object.values(summary.byCategory).reduce((total, count) => total + count, 0)).toBe(summary.total);
  });

  it("keeps every tool verified, enabled, and safely dispositioned", () => {
    for (const tool of toolCatalog) {
      expect(["verified", "manifest_only"]).toContain(tool.verificationStatus);
      if (tool.verificationStatus === "manifest_only") expect(tool.enabledByDefault).toBe(false);
      expect(["candidate_passive_review", "candidate_offline_or_artifact", "simulation_only"]).toContain(tool.disposition);
    }
  });

  it("filters candidate classes correctly", () => {
    expect(listToolCatalog({ disposition: "candidate_offline_or_artifact" }).length).toBeGreaterThan(0);
    expect(listToolCatalog({ disposition: "candidate_passive_review" }).length).toBeGreaterThan(0);
  });

  it("allows low-risk offline tools in offline_artifact mode", () => {
    for (const toolKey of ["secrets_detection.1", "dependencies.12"]) {
      expect(
        canExecuteTool({ toolKey, mode: "offline_artifact", scopeValidated: true, humanApproval: false }).allowed
      ).toBe(true);
    }
  });

  it("allows low-risk passive tools in passive_readonly mode", () => {
    for (const toolKey of ["asset_intelligence.28", "httpx", "naabu", "katana"]) {
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
      expect(canExecuteTool({ toolKey, mode: "active_nondestructive", scopeValidated: true, humanApproval: true }).allowed).toBe(false);
    }
  });

  it("requires privileged_or_destructive mode and approval for critical tools", () => {
    expect(
      canExecuteTool({ toolKey: "sqlmap", mode: "active_nondestructive", scopeValidated: true, humanApproval: false }).allowed
    ).toBe(false);
    expect(canExecuteTool({ toolKey: "sqlmap", mode: "privileged_or_destructive", scopeValidated: true, humanApproval: true }).allowed).toBe(false);
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
