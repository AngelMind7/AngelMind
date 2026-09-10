import { describe, expect, it } from "vitest";
import { parsePassiveInventory, summarizePassiveInventoryDelta } from "./passive-inventory";

describe("passive inventory parser", () => {
  it("parses CSV without fetching or probing assets", () => {
    const assets = parsePassiveInventory({ content: "hostname\napp.example.com\nold.example.com", format: "csv", allowlist: ["example.com"], exclusions: ["old.example.com"] });
    expect(assets).toEqual([
      { value: "app.example.com", hostname: "app.example.com", source: "csv", inScope: true, reason: "allowlisted" },
      { value: "old.example.com", hostname: "old.example.com", source: "csv", inScope: false, reason: "excluded" },
    ]);
  });

  it("parses JSON URLs and marks outside scope", () => {
    const assets = parsePassiveInventory({ content: JSON.stringify(["https://api.example.com/path", "other.test"]), format: "json", allowlist: ["example.com"], exclusions: [] });
    expect(assets[0]?.hostname).toBe("api.example.com");
    expect(assets[0]?.inScope).toBe(true);
    expect(assets[1]?.reason).toBe("outside-allowlist");
  });

  it("rejects non-array JSON input", () => {
    expect(() => parsePassiveInventory({ content: JSON.stringify({ host: "example.com" }), format: "json", allowlist: ["example.com"], exclusions: [] })).toThrow("must be an array");
  });

  it("summarizes new and stale hostnames deterministically", () => {
    const parsed = parsePassiveInventory({ content: JSON.stringify(["api.example.com", "new.example.com"]), format: "json", allowlist: ["example.com"], exclusions: [] });
    expect(summarizePassiveInventoryDelta([{ hostname: "api.example.com", status: "active" }, { hostname: "old.example.com", status: "active" }, { hostname: "retired.example.com", status: "retired" }], parsed)).toEqual({ totalCandidates: 2, inScopeCount: 2, newHostnames: ["new.example.com"], staleHostnames: ["old.example.com"] });
  });
});
