import { describe, expect, it } from "vitest";
import { getSandboxConcurrency, sandboxOutputWithinLimit, sandboxSpawn } from "./runtime-sandbox";

describe("runtime sandbox", () => {
  it("rejects unsafe timeout and output limits before spawning", () => {
    expect(() => sandboxSpawn("true", [], { timeoutMs: 500, maxOutputBytes: 1024 })).toThrow("sandbox_timeout_limit");
    expect(() => sandboxSpawn("true", [], { timeoutMs: 1_000, maxOutputBytes: 512 })).toThrow("sandbox_output_limit");
  });

  it("enforces output byte limits", () => {
    expect(sandboxOutputWithinLimit("ok", 2)).toBe(true);
    expect(sandboxOutputWithinLimit("ok", 1)).toBe(false);
  });

  it("exposes bounded process concurrency", () => {
    const concurrency = getSandboxConcurrency();
    expect(concurrency.active).toBeGreaterThanOrEqual(0);
    expect(concurrency.active).toBeLessThanOrEqual(concurrency.limit);
    expect(concurrency.limit).toBe(8);
  });
});
