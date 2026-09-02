import { describe, expect, it } from "vitest";
import { decryptAuditState, encryptAuditState, isEncryptedAuditState } from "./audit-state-crypto";

describe("audit state encryption", () => {
  it("round-trips JSON state and rejects tampering or short keys", () => {
    const key = "audit-state-test-key-01234567890123456789";
    const encrypted = encryptAuditState({ actorUserId: 7, action: "review" }, key);
    expect(isEncryptedAuditState(encrypted)).toBe(true);
    expect(decryptAuditState(encrypted, key)).toEqual({ actorUserId: 7, action: "review" });
    expect(() => decryptAuditState(`${encrypted}x`, key)).toThrow();
    expect(() => encryptAuditState({}, "short")).toThrow("at least 32");
    expect(() => encryptAuditState(undefined, key)).toThrow("JSON-serializable");
    expect(() => decryptAuditState("v1.too.few", key)).toThrow("format is invalid");
    expect(isEncryptedAuditState(null as never)).toBe(false);
  });
});
