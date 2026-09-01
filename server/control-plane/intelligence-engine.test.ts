import { describe, expect, it } from "vitest";
import { assertPassivePlaybookTaskType, compareAssetSnapshots, matchPlaybooks, normalizeIntelligenceFeed, validateFailureObservation } from "./intelligence-engine";

describe("intelligence engine", () => {
  it("deduplicates and validates failure evidence references", () => {
    expect(validateFailureObservation({ kind: "timeout", normalState: "healthy", condition: "request timeout", observedBehavior: "worker retries", impact: "medium", evidenceRefs: ["ev-1", "ev-1"] })).toMatchObject({ evidenceRefs: ["ev-1"] });
    expect(() => validateFailureObservation({ kind: "timeout", normalState: "", condition: "x", observedBehavior: "y", impact: "low", evidenceRefs: [] })).toThrow();
  });

  it("returns a deterministic evolution diff", () => {
    expect(compareAssetSnapshots(
      { assetId: "a", version: "1", capturedAt: "2026-01-01T00:00:00Z", attributes: { framework: "react", port: 443, old: true } },
      { assetId: "a", version: "2", capturedAt: "2026-01-02T00:00:00Z", attributes: { framework: "next", port: 443, added: "yes" } },
    )).toEqual([
      { key: "added", before: null, after: "yes", kind: "added" },
      { key: "framework", before: "react", after: "next", kind: "changed" },
      { key: "old", before: true, after: null, kind: "removed" },
    ]);
  });

  it("matches playbooks by domain, asset type, and technology", () => {
    const playbooks = [
      { id: "web", version: "1", domains: ["web"], assetTypes: ["domain"], taskTemplates: [] },
      { id: "api-next", version: "1", domains: ["api"], assetTypes: ["api"], technologies: ["next"], taskTemplates: [] },
    ];
    expect(matchPlaybooks(playbooks, { domain: "api", assetType: "api", technology: "next" }).map(playbook => playbook.id)).toEqual(["api-next"]);
  });

  it("rejects unsafe playbook task types", () => {
    expect(assertPassivePlaybookTaskType("evidence_review")).toBe("evidence_review");
    expect(() => assertPassivePlaybookTaskType("active_scan")).toThrow("passive research safety boundary");
    expect(() => assertPassivePlaybookTaskType("credential_replay")).toThrow("passive research safety boundary");
  });

  it("normalizes and bounds intelligence feed metadata", () => {
    expect(normalizeIntelligenceFeed({ source: " DNS ", observedAt: "2026-01-01T00:00:00Z", assetRef: " Example.COM ", confidence: 91.4, reference: " ref ", data: { records: ["A"] } })).toMatchObject({ source: "dns", assetRef: "example.com", confidence: 91, reference: "ref" });
    expect(() => normalizeIntelligenceFeed({ source: "dns", observedAt: "invalid", assetRef: "a", confidence: 50, data: {} })).toThrow();
  });
});
