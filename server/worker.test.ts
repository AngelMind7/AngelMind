import { describe, expect, it } from "vitest";
import { computeRetryDelayMs, parseJobPayload, resolveJobTraceContext, shouldDeadLetter } from "./worker";

describe("durable worker retry policy", () => {
  it("uses bounded exponential backoff", () => {
    expect(computeRetryDelayMs(1)).toBe(5_000);
    expect(computeRetryDelayMs(2)).toBe(10_000);
    expect(computeRetryDelayMs(3)).toBe(20_000);
    expect(computeRetryDelayMs(99)).toBe(60 * 60 * 1_000);
    expect(computeRetryDelayMs(Number.NaN)).toBe(5_000);
    expect(computeRetryDelayMs(Number.POSITIVE_INFINITY)).toBe(5_000);
    expect(computeRetryDelayMs(1, Number.NaN)).toBe(60 * 60 * 1_000);
    expect(computeRetryDelayMs(1, -1)).toBe(0);
  });

  it("dead-letters only after the configured attempt limit", () => {
    expect(shouldDeadLetter(1, 3)).toBe(false);
    expect(shouldDeadLetter(3, 3)).toBe(true);
    expect(shouldDeadLetter(4, 3)).toBe(true);
    expect(shouldDeadLetter(Number.NaN, 3)).toBe(false);
    expect(shouldDeadLetter(1, Number.NaN)).toBe(true);
  });

  it("parses only bounded JSON objects", () => {
    expect(parseJobPayload('{"type":"test"}')).toEqual({ type: "test" });
    expect(() => parseJobPayload("not-json")).toThrow("valid JSON");
    expect(() => parseJobPayload("[]")).toThrow("JSON object");
    expect(() => parseJobPayload('"string"')).toThrow("JSON object");
  });

  it("preserves payload correlation and falls back to the durable job id", () => {
    expect(resolveJobTraceContext({ id: 41, traceId: "trace-from-job" }, { requestId: "req-7", traceId: "trace-from-payload" })).toEqual({ requestId: "req-7", traceId: "trace-from-payload" });
    expect(resolveJobTraceContext({ id: 41, traceId: "trace-from-job" }, {})).toEqual({ requestId: "job:41", traceId: "trace-from-job" });
    expect(resolveJobTraceContext({ id: 41, traceId: null }, {})).toEqual({ requestId: "job:41", traceId: "job:41" });
    expect(resolveJobTraceContext({ id: 41, traceId: "  job-trace  " }, { requestId: "  request-id  " })).toEqual({ requestId: "request-id", traceId: "job-trace" });
    expect(resolveJobTraceContext({ id: 41, traceId: "x".repeat(400) }, { requestId: "y".repeat(400) }).requestId).toHaveLength(256);
    expect(resolveJobTraceContext({ id: 41, traceId: "x".repeat(400) }, { requestId: "y".repeat(400) }).traceId).toHaveLength(256);
  });
});