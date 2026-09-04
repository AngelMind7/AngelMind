import { describe, expect, it } from "vitest";
import { decideRuntimeResources, runtimeConcurrencyLimit } from "./runtime-resource-policy";

describe("runtime resource policy", () => {
  it("bounds timeout and output without trusting caller limits", () => {
    expect(decideRuntimeResources({ mode: "offline_artifact", inputBytes: 10, timeoutMs: 1, maxOutputBytes: 1 })).toEqual({
      allowed: true,
      timeoutMs: 1_000,
      maxOutputBytes: 1_024,
    });
    expect(decideRuntimeResources({ mode: "offline_artifact", inputBytes: 10, timeoutMs: 999_999, maxOutputBytes: 999_999_999 })).toEqual({
      allowed: true,
      timeoutMs: 120_000,
      maxOutputBytes: 2_000_000,
    });
  });

  it("rejects oversized inputs and privileged runtime execution", () => {
    expect(decideRuntimeResources({ mode: "offline_artifact", inputBytes: 2_000_001 }).allowed).toBe(false);
    expect(decideRuntimeResources({ mode: "privileged_or_destructive", inputBytes: 10 })).toEqual({
      allowed: false,
      reason: "privileged_runtime_disabled",
    });
  });

  it("keeps concurrency bounded even when misconfigured", () => {
    const previous = process.env.ANGELMIND_RUNTIME_CONCURRENCY;
    process.env.ANGELMIND_RUNTIME_CONCURRENCY = "999";
    expect(runtimeConcurrencyLimit()).toBe(16);
    process.env.ANGELMIND_RUNTIME_CONCURRENCY = "0";
    expect(runtimeConcurrencyLimit()).toBe(1);
    if (previous === undefined) delete process.env.ANGELMIND_RUNTIME_CONCURRENCY;
    else process.env.ANGELMIND_RUNTIME_CONCURRENCY = previous;
  });
});
