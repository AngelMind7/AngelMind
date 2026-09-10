import { describe, expect, it } from "vitest";
import { decryptEnvelope, encryptEnvelope, isEnvelope } from "./envelope-crypto";

const current = "current-envelope-key-012345678901234567890";
const previous = "previous-envelope-key-01234567890123456789";

describe("versioned envelope encryption", () => {
  it("round-trips with the active key version", () => {
    const encrypted = encryptEnvelope("sensitive MFA material", current, "2026-09");
    expect(isEnvelope(encrypted)).toBe(true);
    expect(decryptEnvelope(encrypted, { "2026-09": current })).toBe("sensitive MFA material");
  });

  it("supports decrypting a previous key during rotation", () => {
    const encrypted = encryptEnvelope("legacy secret", previous, "previous");
    expect(decryptEnvelope(encrypted, { current, previous })).toBe("legacy secret");
    expect(() => decryptEnvelope(encrypted, { current })).toThrow("unavailable");
  });

  it("rejects tampered ciphertext and invalid keys", () => {
    const encrypted = encryptEnvelope("secret", current, "current");
    const parts = encrypted.split(".");
    parts[4] = `${parts[4][0] === "A" ? "B" : "A"}${parts[4].slice(1)}`;
    expect(() => decryptEnvelope(parts.join("."), { current })).toThrow();
    expect(() => encryptEnvelope("secret", "short", "current")).toThrow("at least 32");
  });
});
