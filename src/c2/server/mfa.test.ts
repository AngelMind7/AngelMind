import { describe, expect, it } from "vitest";
import { generateRecoveryCodes, generateTotpCode, verifyTotpCode } from "./mfa";

describe("MFA security primitives", () => {
  it("generates the RFC 6238-compatible SHA-1 TOTP vector", () => {
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    expect(generateTotpCode(secret, 59_000)).toBe("287082");
    expect(verifyTotpCode(secret, "287082", 59_000)).toBe(true);
  });

  it("accepts only the configured one-step clock-drift window", () => {
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    const timestamp = 1_700_000_000_000;
    const adjacentCode = generateTotpCode(secret, timestamp + 30_000);
    expect(verifyTotpCode(secret, adjacentCode, timestamp)).toBe(true);
    expect(verifyTotpCode(secret, generateTotpCode(secret, timestamp + 120_000), timestamp)).toBe(false);
    expect(verifyTotpCode(secret, "12345", timestamp)).toBe(false);
  });

  it("generates the requested number of non-empty recovery codes", () => {
    const codes = generateRecoveryCodes(10);
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    expect(codes.every(code => /^[0-9a-f]{8}-[0-9a-f]{8}$/.test(code))).toBe(true);
  });
});

