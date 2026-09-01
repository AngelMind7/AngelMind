import { describe, expect, it } from "vitest";
import { normalizeStorageKey } from "./storage";

describe("Supabase storage object keys", () => {
  it("normalizes leading separators and Windows separators", () => {
    expect(normalizeStorageKey("\\workspace-1\\evidence\\artifact.txt")).toBe("workspace-1/evidence/artifact.txt");
  });

  it("rejects traversal and empty path segments", () => {
    for (const key of ["../secret.txt", "workspace/../secret.txt", "workspace//secret.txt", "./secret.txt", ""]) {
      expect(() => normalizeStorageKey(key)).toThrow();
    }
  });

  it("rejects NUL bytes", () => {
    expect(() => normalizeStorageKey("workspace/evidence/evil\0.txt")).toThrow();
  });
});
