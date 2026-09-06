import { describe, expect, it } from "vitest";
import { distributedCircuitConfig } from "./llm-distributed-circuit";

describe("distributed provider circuit policy", () => {
  it("uses bounded failure, cooldown, and probe lease limits", () => {
    expect(distributedCircuitConfig()).toEqual({ failureThreshold: 3, cooldownMs: 30_000, probeLeaseMs: 10_000 });
  });
});
