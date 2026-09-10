export type CircuitState = "closed" | "open" | "half_open";

export type CircuitSnapshot = {
  provider: string;
  state: CircuitState;
  consecutiveFailures: number;
  openedAt: number | null;
  nextProbeAt: number | null;
};

export type CircuitBreakerOptions = {
  failureThreshold?: number;
  cooldownMs?: number;
  now?: () => number;
};

export class ProviderCircuitBreaker {
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;
  private consecutiveFailures = 0;
  private state: CircuitState = "closed";
  private openedAt: number | null = null;
  private probeInFlight = false;

  constructor(private readonly provider: string, options: CircuitBreakerOptions = {}) {
    this.failureThreshold = Math.max(1, Math.trunc(options.failureThreshold ?? 3));
    this.cooldownMs = Math.max(1, Math.trunc(options.cooldownMs ?? 30_000));
    this.now = options.now ?? Date.now;
  }

  allowRequest(): boolean {
    const now = this.now();
    if (this.state === "closed") return true;
    if (this.state === "open") {
      if (this.openedAt === null || now - this.openedAt < this.cooldownMs || this.probeInFlight) return false;
      this.state = "half_open";
      this.probeInFlight = true;
      return true;
    }
    if (this.probeInFlight) return false;
    this.probeInFlight = true;
    return true;
  }

  recordSuccess() {
    this.consecutiveFailures = 0;
    this.state = "closed";
    this.openedAt = null;
    this.probeInFlight = false;
  }

  recordFailure() {
    this.probeInFlight = false;
    this.consecutiveFailures += 1;
    if (this.state === "half_open" || this.consecutiveFailures >= this.failureThreshold) {
      this.state = "open";
      this.openedAt = this.now();
    }
  }

  snapshot(): CircuitSnapshot {
    return {
      provider: this.provider,
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      openedAt: this.openedAt,
      nextProbeAt: this.openedAt === null ? null : this.openedAt + this.cooldownMs,
    };
  }
}

export function createProviderCircuitBreakers(providerNames: string[], options: CircuitBreakerOptions = {}) {
  return new Map(providerNames.map(name => [name, new ProviderCircuitBreaker(name, options)]));
}
