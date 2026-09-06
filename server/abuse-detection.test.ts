import { beforeEach, describe, expect, it } from "vitest";
import { getAbuseDetectionSnapshot, recordAbuseViolation, resetAbuseDetectionForTests } from "./abuse-detection";

describe("behavioral abuse detection", () => {
  beforeEach(() => resetAbuseDetectionForTests());

  it("raises bounded risk and enters cooldown after repeated violations", () => {
    const input = { cooldownMs: 1_000, strikeThreshold: 3, credentialFingerprint: "Bearer one", now: 1_000 };
    expect(recordAbuseViolation("ip:a", input).action).toBe("allow");
    expect(recordAbuseViolation("ip:a", { ...input, now: 1_100, credentialFingerprint: "Bearer two" }).action).toBe("observe");
    const decision = recordAbuseViolation("ip:a", { ...input, now: 1_200 });
    expect(decision.action).toBe("cooldown");
    expect(decision.score).toBeGreaterThan(0);
    expect(decision.blockedUntil).toBeGreaterThan(1_200);
  });

  it("returns hashed, bounded diagnostics instead of raw keys", () => {
    recordAbuseViolation("10.0.0.1:secret", { cooldownMs: 1_000, strikeThreshold: 2, now: 2_000 });
    const [signal] = getAbuseDetectionSnapshot(2_001);
    expect(signal.key).not.toContain("10.0.0.1");
    expect(signal.credentialVariantCount).toBe(0);
  });
});
