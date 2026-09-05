import { describe, expect, it } from "vitest";
import { toolCatalog } from "./tool-catalog";

describe("blueprint safety contract", () => {
  it("keeps every registered tool behind a verified, governed disposition", () => {
    expect(toolCatalog.length).toBeGreaterThan(0);
    for (const tool of toolCatalog) {
      expect(["verified", "manifest_only"]).toContain(tool.verificationStatus);
      expect(["candidate_offline_or_artifact", "candidate_passive_review", "simulation_only"]).toContain(tool.disposition);
    }
  });

  it("never enables an unverified or blocked tool by default", () => {
    for (const tool of toolCatalog) {
      if (tool.verificationStatus !== "verified" || tool.disposition === "disabled_high_risk" || tool.disposition === "disabled_review_required" || tool.verificationStatus === "manifest_only") {
        expect(tool.enabledByDefault).toBe(false);
      }
    }
  });
});
