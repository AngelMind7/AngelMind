import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { listCapabilities } from "./capability-registry";

type Manifest = {
  tools: Array<{ id: string; adapter: string; capabilities: string[]; artifact: string; execution: string }>;
};

const manifest = JSON.parse(
  readFileSync(resolve(process.cwd(), "config/tool-capability-registry.json"), "utf8"),
) as Manifest;

describe("tool registry contract", () => {
  it("contains the 15 master tools", () => {
    expect(manifest.tools).toHaveLength(15);
    expect(new Set(manifest.tools.map((tool) => tool.id)).size).toBe(15);
  });

  it("keeps every configured tool explicitly authorized-only", () => {
    expect(manifest.tools.every((tool) => tool.execution === "authorized-only")).toBe(true);
  });

  it("uses the same adapter names as the capability registry", () => {
    const adapters = new Set(manifest.tools.map((tool) => tool.adapter));
    for (const capability of listCapabilities()) {
      expect(adapters.has(capability.primaryAdapter)).toBe(true);
      for (const fallback of capability.fallbackAdapters) expect(adapters.has(fallback)).toBe(true);
    }
  });
});
