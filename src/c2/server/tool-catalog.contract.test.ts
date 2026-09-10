import { describe, expect, it } from "vitest";
import { getToolCatalogSummary, listToolCatalog } from "./tool-catalog";

describe("UTF catalog contract", () => {
  it("keeps the blueprint registry expanded beyond the core runtime adapters", () => {
    const summary = getToolCatalogSummary();
    expect(summary.total).toBeGreaterThanOrEqual(50);
  });

  it("keeps every catalog module available while isolating target-facing simulations", () => {
    const catalog = listToolCatalog();
    expect(catalog.length).toBeGreaterThanOrEqual(50);
    expect(catalog.filter(tool => tool.enabledByDefault).length).toBeGreaterThanOrEqual(17);
    expect(catalog.filter(tool => !tool.enabledByDefault).length).toBeGreaterThan(0);

    const simulationOnly = listToolCatalog({ disposition: "simulation_only" });
    expect(simulationOnly.length).toBeGreaterThan(0);
    expect(simulationOnly.every(tool => tool.enabledByDefault === true || tool.verificationStatus === "manifest_only")).toBe(true);
  });
});
