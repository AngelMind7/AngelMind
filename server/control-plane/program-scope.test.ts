import { describe, expect, it } from "vitest";
import { diffProgramScope, nextProgramScopeVersion, normalizeProgramScope } from "./program-scope";

describe("program scope engine", () => {
  it("normalizes lists and rejects included/excluded overlap", () => {
    expect(normalizeProgramScope({ includedAssets: [" app.example ", "app.example"], excludedAssets: [], rules: [" safe "], safeHarbor: "Authorized", version: 1 })).toEqual({ includedAssets: ["app.example"], excludedAssets: [], rules: ["safe"], safeHarbor: "Authorized", version: 1 });
    expect(() => normalizeProgramScope({ includedAssets: ["app.example"], excludedAssets: ["app.example"], rules: [], safeHarbor: "Authorized" })).toThrow("both included and excluded");
  });

  it("detects scope changes and classifies removed assets as high impact", () => {
    const diff = diffProgramScope({ includedAssets: ["app.example", "api.example"], excludedAssets: [], rules: [], safeHarbor: "v1", version: 2 }, { includedAssets: ["app.example"], excludedAssets: ["admin.example"], rules: ["no destructive actions"], safeHarbor: "v1" });
    expect(diff.includedRemoved).toEqual(["api.example"]);
    expect(diff.excludedAdded).toEqual(["admin.example"]);
    expect(diff.impact).toBe("high");
    expect(nextProgramScopeVersion({ includedAssets: ["app.example"], excludedAssets: [], rules: [], safeHarbor: "v1", version: 2 }, { includedAssets: ["app.example"], excludedAssets: [], rules: ["review"], safeHarbor: "v1" }).version).toBe(3);
  });

  it("rejects malformed lists and invalid versions", () => {
    expect(() => normalizeProgramScope({ includedAssets: null as never, excludedAssets: [], rules: [], safeHarbor: "Authorized" })).toThrow(/lists must be arrays/);
    expect(() => normalizeProgramScope({ includedAssets: ["app"], excludedAssets: [], rules: [], safeHarbor: "Authorized", version: 0 })).toThrow(/positive integer/);
    expect(() => normalizeProgramScope({ includedAssets: ["app"], excludedAssets: [], rules: [], safeHarbor: "Authorized", version: Number.NaN })).toThrow(/positive integer/);
  });
});
