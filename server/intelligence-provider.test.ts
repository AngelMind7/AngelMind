import { describe, expect, it, vi } from "vitest";
import { assertAllowedIntelligenceUrl, fetchIntelligenceFeed } from "./intelligence-provider";

describe("intelligence provider adapter", () => {
  it("requires HTTPS", () => {
    expect(() => assertAllowedIntelligenceUrl("http://feeds.example.test/items")).toThrow("HTTPS");
  });

  it("normalizes an approved JSON feed", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify([{ source: "Vendor", observedAt: "2026-09-01T00:00:00Z", assetRef: "Example.COM", confidence: 88, data: { type: "advisory" } }]), { status: 200 }));
    const result = await fetchIntelligenceFeed("https://feeds.example.test/items");
    expect(result[0].assetRef).toBe("Example.COM");
    expect(result[0].source).toBe("Vendor");
    fetchMock.mockRestore();
  });

  it("rejects non-JSON provider responses", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("not-json", { status: 200 }));
    await expect(fetchIntelligenceFeed("https://feeds.example.test/items")).rejects.toThrow("valid JSON");
    fetchMock.mockRestore();
  });
});
