import { describe, expect, it } from "vitest";
import { hashIdempotencyRequest, normalizeIdempotencyKey } from "./idempotency";

describe("generic idempotency contract", () => {
  it("normalizes valid keys and rejects invalid lengths", () => {
    expect(normalizeIdempotencyKey("  request-123  ")).toBe("request-123");
    expect(() => normalizeIdempotencyKey("short")).toThrow(/8-180/);
    expect(() => normalizeIdempotencyKey("x".repeat(181))).toThrow(/8-180/);
  });

  it("produces a stable SHA-256 request fingerprint", () => {
    const first = hashIdempotencyRequest({ workspaceId: 7, action: "create" });
    const second = hashIdempotencyRequest({ workspaceId: 7, action: "create" });
    const different = hashIdempotencyRequest({ workspaceId: 7, action: "delete" });
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toBe(first);
    expect(different).not.toBe(first);
  });
});
