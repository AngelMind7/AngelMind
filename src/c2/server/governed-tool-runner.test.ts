import { describe, expect, it } from "vitest";
import { governedRuntimeConcurrencyForTests } from "./governed-tool-runner";

describe("governed tool runner", () => {
  it("exposes a bounded concurrency ceiling", () => {
    const state = governedRuntimeConcurrencyForTests();
    expect(state.active).toBe(0);
    expect(state.queued).toBe(0);
    expect(state.limit).toBeGreaterThanOrEqual(1);
    expect(state.limit).toBeLessThanOrEqual(16);
  });
});
