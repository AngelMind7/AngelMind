import { describe, expect, it } from "vitest";
import { assertExpectedRevision, decodePageCursor, encodePageCursor, nextRevision, pageResult, requestFingerprint } from "./query-safety";

describe("query safety primitives", () => {
  it("round-trips a cursor and rejects malformed values", () => {
    const encoded = encodePageCursor({ createdAt: "2026-09-01T00:00:00Z", id: 7 });
    expect(decodePageCursor(encoded)).toEqual({ createdAt: "2026-09-01T00:00:00.000Z", id: 7 });
    expect(() => decodePageCursor("invalid")).toThrow("Invalid pagination cursor");
  });

  it("returns a bounded page and continuation cursor", () => {
    const rows = Array.from({ length: 3 }, (_, index) => ({ id: index + 1, createdAt: new Date(2026, 0, index + 1) }));
    const result = pageResult(rows, 2);
    expect(result.items).toHaveLength(2);
    expect(result.hasNextPage).toBe(true);
    expect(result.nextCursor).toBeTruthy();
    expect(pageResult(rows, Number.NaN).items).toHaveLength(3);
    expect(pageResult(rows, Number.POSITIVE_INFINITY).items).toHaveLength(3);
  });

  it("fails closed on stale revisions and advances valid revisions", () => {
    expect(() => assertExpectedRevision(1, 2)).toThrow("Concurrent update detected");
    expect(() => assertExpectedRevision(2, 2)).not.toThrow();
    expect(nextRevision(4)).toBe(5);
    expect(requestFingerprint({ method: "post", path: "/api/test", body: { a: 1 } })).toHaveLength(64);
    expect(() => requestFingerprint({ method: " ", path: "/api/test", body: {} })).toThrow("Request method is required");
    expect(() => requestFingerprint({ method: "POST", path: "api/test", body: {} })).toThrow("Request path must be absolute");
  });
});
