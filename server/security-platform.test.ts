import { describe, expect, it } from "vitest";
import { normalizeApiKeyScopes } from "./security-platform";

describe("API key scope policy", () => {
  it("normalizes, deduplicates, and bounds scopes", () => {
    expect(normalizeApiKeyScopes([" Research.Read ", "research.read", "evidence:write"]))
      .toEqual(["research.read", "evidence:write"]);
  });

  it("rejects malformed or unbounded scope grants", () => {
    expect(() => normalizeApiKeyScopes([])).toThrow();
    expect(() => normalizeApiKeyScopes(["scope with spaces"])).toThrow();
    expect(() => normalizeApiKeyScopes(Array.from({ length: 33 }, (_, index) => `scope-${index}`))).toThrow();
  });
});
