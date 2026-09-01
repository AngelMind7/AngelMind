import { describe, expect, it } from "vitest";
import { TargetRateLimiter, normalizeEvidence, verifyEvidenceHash } from "./evidence-normalizer";

describe("canonical evidence normalizer", () => {
  it("redacts credentials and sanitizes untrusted strings", () => {
    const result = normalizeEvidence({
      data: { api_key: "0123456789abcdef", password: "open-sesame", body: "<script>alert(1)</script>\u0000" },
      capabilities: ["secret-detection"],
      confidence: 1.4,
    });
    expect(result.data.api_key).toBe("0123…cdef");
    expect(result.data.password).toBe("[REDACTED]");
    expect(result.data.body).toContain("&lt;script&gt;");
    expect(result.classification).toBe("restricted");
    expect(result.confidence).toBe(1);
    expect(verifyEvidenceHash(result)).toBe(true);
  });

  it("normalizes timestamps and removes duplicate chain references", () => {
    const result = normalizeEvidence({
      data: { port: 443 },
      observedAt: "2026-09-01T00:00:00+07:00",
      capabilities: ["network-analysis"],
      chainReferences: ["SEQ-001", "SEQ-001", ""],
      confidence: -1,
    });
    expect(result.observedAt).toBe("2026-08-31T17:00:00.000Z");
    expect(result.chainReferences).toEqual(["SEQ-001"]);
    expect(result.classification).toBe("sensitive");
    expect(result.confidence).toBe(0);
  });
});

describe("target-side rate limiter", () => {
  it("enforces a per-target interval and permits independent targets", () => {
    let now = 0;
    const limiter = new TargetRateLimiter(() => now);
    expect(limiter.allow("Example.com", 60)).toBe(true);
    expect(limiter.allow("example.com", 60)).toBe(false);
    expect(limiter.allow("other.example", 60)).toBe(true);
    now = 1_000;
    expect(limiter.allow("example.com", 60)).toBe(true);
  });
});
