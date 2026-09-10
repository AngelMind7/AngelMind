import { describe, expect, it } from "vitest";
import { assertCursor, createCursor, normalizePageSize, pageFingerprint, parseCursor } from "./pagination";

describe("pagination contract", () => {
  it("bounds page size deterministically", () => {
    expect(normalizePageSize()).toBe(50);
    expect(normalizePageSize(0)).toBe(1);
    expect(normalizePageSize(999)).toBe(100);
    expect(normalizePageSize(Number.NaN)).toBe(50);
  });

  it("round-trips an opaque scoped cursor", () => {
    const cursor = createCursor(42, "workspace:7:findings");
    expect(parseCursor(cursor, "workspace:7:findings")).toEqual({ after: "42", scope: "workspace:7:findings" });
    expect(assertCursor(cursor, "workspace:7:findings")).toEqual({ after: "42", scope: "workspace:7:findings" });
  });

  it("rejects malformed or cross-scope cursors", () => {
    expect(parseCursor("not-a-cursor")).toBeNull();
    const cursor = createCursor("100", "workspace:1");
    expect(parseCursor(cursor, "workspace:2")).toBeNull();
    expect(() => assertCursor(cursor, "workspace:2")).toThrow("Invalid or expired pagination cursor.");
  });

  it("produces stable fingerprints", () => {
    expect(pageFingerprint("findings", createCursor(10), 20)).toBe(pageFingerprint("findings", createCursor(10), 20));
    expect(pageFingerprint("findings", createCursor(10), 20)).not.toBe(pageFingerprint("findings", createCursor(11), 20));
  });
});
