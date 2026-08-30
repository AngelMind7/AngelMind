import { describe, expect, it } from "vitest";
import { computeRetryDelayMs, shouldDeadLetter } from "./worker";

describe("durable worker retry policy", () => {
  it("uses bounded exponential backoff", () => {
    expect(computeRetryDelayMs(1)).toBe(5_000);
    expect(computeRetryDelayMs(2)).toBe(10_000);
    expect(computeRetryDelayMs(3)).toBe(20_000);
    expect(computeRetryDelayMs(99)).toBe(60 * 60 * 1_000);
  });

  it("dead-letters only after the configured attempt limit", () => {
    expect(shouldDeadLetter(1, 3)).toBe(false);
    expect(shouldDeadLetter(3, 3)).toBe(true);
    expect(shouldDeadLetter(4, 3)).toBe(true);
  });
});
