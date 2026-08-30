import { describe, expect, it } from "vitest";
import { canExecuteTool, getToolCatalogSummary, listToolCatalog, toolCatalog } from "./tool-catalog";

describe("tool catalog safety boundary", () => {
  it("loads the complete manifest as disabled provisional metadata", () => {
    expect(toolCatalog).toHaveLength(556);
    expect(toolCatalog.every(tool => tool.enabledByDefault === false)).toBe(true);
    expect(toolCatalog.every(tool => tool.verificationStatus === "provisional_from_user_pdf")).toBe(true);
  });

  it("matches manifest risk totals", () => {
    const summary = getToolCatalogSummary();
    expect(summary.total).toBe(556);
    expect(summary.byRisk).toEqual({ low: 246, medium: 187, high: 74, critical: 49 });
  });

  it("filters safe candidate classes without enabling them", () => {
    expect(listToolCatalog({ disposition: "candidate_offline_or_artifact" })).toHaveLength(161);
    expect(listToolCatalog({ disposition: "candidate_passive_review" })).toHaveLength(72);
    expect(listToolCatalog({ disposition: "disabled_high_risk" })).toHaveLength(123);
  });

  it("rejects every provisional tool before execution", () => {
    const result = canExecuteTool({
      toolKey: "ai_llm_security.1",
      mode: "offline_artifact",
      scopeValidated: true,
      humanApproval: false,
    });
    expect(result).toEqual({ allowed: false, reason: "tool_not_verified" });
  });

  it("rejects unknown and privileged tool keys", () => {
    expect(canExecuteTool({ toolKey: "missing.1", mode: "passive_readonly", scopeValidated: true, humanApproval: true })).toEqual({ allowed: false, reason: "tool_not_found" });
    expect(canExecuteTool({ toolKey: "post-exploitation.1", mode: "privileged_or_destructive", scopeValidated: true, humanApproval: true })).toEqual({ allowed: false, reason: "tool_not_verified" });
  });
});
