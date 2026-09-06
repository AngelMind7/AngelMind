import { describe, expect, it } from "vitest";
import { ProviderCircuitBreaker } from "./llm-circuit-breaker";

describe("provider circuit breaker", () => {
  it("opens after the threshold and rejects requests during cooldown", () => {
    let now = 1_000;
    const circuit = new ProviderCircuitBreaker("9router", { failureThreshold: 2, cooldownMs: 100, now: () => now });
    expect(circuit.allowRequest()).toBe(true);
    circuit.recordFailure();
    expect(circuit.snapshot().state).toBe("closed");
    circuit.recordFailure();
    expect(circuit.snapshot().state).toBe("open");
    expect(circuit.allowRequest()).toBe(false);
    now += 101;
    expect(circuit.allowRequest()).toBe(true);
    expect(circuit.snapshot().state).toBe("half_open");
  });

  it("closes after a successful half-open probe and isolates concurrent probes", () => {
    let now = 1_000;
    const circuit = new ProviderCircuitBreaker("omniroute", { failureThreshold: 1, cooldownMs: 10, now: () => now });
    expect(circuit.allowRequest()).toBe(true);
    circuit.recordFailure();
    now += 11;
    expect(circuit.allowRequest()).toBe(true);
    expect(circuit.allowRequest()).toBe(false);
    circuit.recordSuccess();
    expect(circuit.snapshot()).toMatchObject({ state: "closed", consecutiveFailures: 0, openedAt: null, nextProbeAt: null });
    expect(circuit.allowRequest()).toBe(true);
  });
});
