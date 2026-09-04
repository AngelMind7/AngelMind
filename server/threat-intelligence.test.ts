import { describe, expect, it, beforeEach } from "vitest";
import { buildCollectionPlan, ingestIntelligence, listIntelligence, normalizeIndicator, registerIntelligenceSource, resetThreatIntelligenceForTests, upsertIndicator } from "./threat-intelligence";

describe("threat intelligence workflow", () => {
  beforeEach(() => resetThreatIntelligenceForTests());
  it("normalizes indicators and deduplicates them", () => {
    const source = registerIntelligenceSource({ name: "Lab feed", kind: "provider", provider: "fixture", enabled: true, rateLimitPerMinute: 30, legalBasis: "public_source" });
    expect(normalizeIndicator("domain", " Example.COM. ")).toBe("example.com");
    const first = upsertIndicator({ type: "domain", value: " Example.COM. ", confidence: 0.4, sourceId: source.id });
    const second = upsertIndicator({ type: "domain", value: "example.com", confidence: 0.9, sourceId: source.id });
    expect(second.id).toBe(first.id);
    expect(second.confidence).toBe(0.9);
  });
  it("requires provenance and keeps collection target execution disabled", () => {
    const source = registerIntelligenceSource({ name: "CVE fixture", kind: "provider", provider: "fixture", enabled: true, rateLimitPerMinute: 60, legalBasis: "public_source" });
    const record = ingestIntelligence({ workspaceId: 7, kind: "cve", title: "Synthetic CVE", summary: "test", sourceId: source.id, confidence: 0.8 });
    expect(record.provenance.bounded).toBe(true);
    expect(listIntelligence(7)).toHaveLength(1);
    expect(buildCollectionPlan(source.id, 7).targetCollectionEnabled).toBe(false);
  });
  it("rejects disabled providers", () => {
    const source = registerIntelligenceSource({ name: "Disabled", kind: "provider", provider: "fixture", enabled: false, rateLimitPerMinute: 10, legalBasis: "contract" });
    expect(() => upsertIndicator({ type: "cve", value: "CVE-2026-0001", confidence: 1, sourceId: source.id })).toThrow("disabled");
  });
});
