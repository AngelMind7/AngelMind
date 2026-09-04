import { describe, expect, it } from "vitest";
import { getToolCatalogSummary, listToolCatalog } from "./tool-catalog";

describe("UTF catalog contract", () => {
  it("keeps the blueprint registry expanded beyond the core runtime adapters", () => {
    const summary = getToolCatalogSummary();
    expect(summary.total).toBeGreaterThanOrEqual(50);
  });

  it("keeps high-risk manifest families disabled by default", () => {
    const simulationOnly = listToolCatalog({ disposition: "simulation_only" });
    expect(simulationOnly.length).toBeGreaterThan(0);
    expect(simulationOnly.every(tool => tool.enabledByDefault === false)).toBe(true);
    expect(simulationOnly.every(tool => tool.verificationStatus === "manifest_only")).toBe(true);
  });
});
