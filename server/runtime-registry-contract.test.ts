import { describe, expect, it } from "vitest";
import { listRegisteredAdapters } from "./tool-runtime";
import {
  getRegisteredTool,
  getRuntimeToolKey,
  getToolByAdapter,
  listRegisteredTools,
} from "./tool-registry";

describe("runtime ↔ canonical tool registry contract", () => {
  it("has a canonical registry entry for every manifest adapter", () => {
    for (const tool of listRegisteredTools()) {
      expect(getToolByAdapter(tool.adapter)?.id).toBe(tool.id);
    }
  });

  it("resolves every canonical tool to an actual runtime tool key", () => {
    const runtimeKeys = new Set(listRegisteredAdapters().map((adapter) => adapter.toolKey));

    for (const tool of listRegisteredTools()) {
      const runtimeKey = getRuntimeToolKey(tool.id);
      expect(runtimeKey).toBeTruthy();
      expect(runtimeKeys.has(runtimeKey!)).toBe(true);
    }
  });

  it("keeps the legacy runtime aliases explicit and stable", () => {
    expect(getRuntimeToolKey("burp_pro")).toBe("burp_suite_pro");
    expect(getRuntimeToolKey("gitleaks")).toBe("secrets_detection.1");
    expect(getRuntimeToolKey("subfinder")).toBe("asset_intelligence.28");
    expect(getRuntimeToolKey("trivy")).toBe("dependencies.12");
  });

  it("rejects an unknown canonical tool rather than silently probing it", () => {
    expect(getRegisteredTool("definitely-not-a-real-tool")).toBeUndefined();
    expect(getToolByAdapter("definitely-not-a-real-adapter")).toBeUndefined();
    expect(getRuntimeToolKey("definitely-not-a-real-tool")).toBeUndefined();
  });
});
