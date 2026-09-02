import { describe, expect, it } from "vitest";
import { computeRetryDelayMs, resolveJobTraceContext, shouldDeadLetter } from "./worker";

describe("durable worker retry policy", () => {
  it("uses bounded exponential backoff", () => {
    expect(computeRetryDelayMs(1)).toBe(5_000);
    expect(computeRetryDelayMs(2)).toBe(10_000);
    expect(computeRetryDelayMs(3)).toBe(20_000);
    expect(computeRetryDelayMs(99)).toBe(60 * 60 * 1_000);
    expect(computeRetryDelayMs(Number.NaN)).toBe(5_000);
    expect(computeRetryDelayMs(Number.POSITIVE_INFINITY)).toBe(5_000);
  });

  it("dead-letters only after the configured attempt limit", () => {
    expect(shouldDeadLetter(1, 3)).toBe(false);
    expect(shouldDeadLetter(3, 3)).toBe(true);
    expect(shouldDeadLetter(4, 3)).toBe(true);
    expect(shouldDeadLetter(Number.NaN, 3)).toBe(false);
    expect(shouldDeadLetter(1, Number.NaN)).toBe(true);
  });

  it("preserves payload correlation and falls back to the durable job id", () => {
    expect(resolveJobTraceContext({ id: 41, traceId: "trace-from-job" }, { requestId: "req-7", traceId: "trace-from-payload" })).toEqual({ requestId: "req-7", traceId: "trace-from-payload" });
    expect(resolveJobTraceContext({ id: 41, traceId: "trace-from-job" }, {})).toEqual({ requestId: "job:41", traceId: "trace-from-job" });
    expect(resolveJobTraceContext({ id: 41, traceId: null }, {})).toEqual({ requestId: "job:41", traceId: "job:41" });
  });
});
