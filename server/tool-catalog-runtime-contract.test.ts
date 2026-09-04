import { describe, expect, it } from "vitest";
import { toolCatalog } from "./tool-catalog";
import { getRegisteredToolAdapter } from "./tool-runtime";

describe("catalog/runtime adapter contract", () => {
  it("has a concrete runtime adapter for every canonical catalog tool", () => {
    expect(toolCatalog).toHaveLength(17);
    for (const tool of toolCatalog) {
      const adapter = getRegisteredToolAdapter(tool.toolKey);
      expect(adapter, `missing adapter for ${tool.toolKey}`).toBeDefined();
      expect(adapter?.toolKey).toBe(tool.toolKey);
    }
  });

  it("does not expose a privileged/destructive catalog tool as a default runtime mode", () => {
    for (const tool of toolCatalog) {
      if (tool.riskClass === "critical") {
        const adapter = getRegisteredToolAdapter(tool.toolKey);
        expect(adapter?.allowedModes).not.toContain("passive_readonly");
        expect(adapter?.allowedModes).toContain("privileged_or_destructive");
      }
    }
  });
});
