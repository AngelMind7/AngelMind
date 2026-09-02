import { afterEach, describe, expect, it, vi } from "vitest";
import { checkProviderProbes, sloConfig } from "./observability";

const originalUrls = process.env.OBSERVABILITY_PROBE_URLS;
const originalNodeEnv = process.env.NODE_ENV;
const originalTimeout = process.env.OBSERVABILITY_PROBE_TIMEOUT_MS;
const originalErrorBudget = process.env.SLO_ERROR_RATE_BUDGET;
const originalSlowBudget = process.env.SLO_SLOW_RATE_BUDGET;
const originalSlowRequest = process.env.SLO_SLOW_REQUEST_MS;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalUrls === undefined) delete process.env.OBSERVABILITY_PROBE_URLS;
  else process.env.OBSERVABILITY_PROBE_URLS = originalUrls;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalTimeout === undefined) delete process.env.OBSERVABILITY_PROBE_TIMEOUT_MS; else process.env.OBSERVABILITY_PROBE_TIMEOUT_MS = originalTimeout;
  if (originalErrorBudget === undefined) delete process.env.SLO_ERROR_RATE_BUDGET; else process.env.SLO_ERROR_RATE_BUDGET = originalErrorBudget;
  if (originalSlowBudget === undefined) delete process.env.SLO_SLOW_RATE_BUDGET; else process.env.SLO_SLOW_RATE_BUDGET = originalSlowBudget;
  if (originalSlowRequest === undefined) delete process.env.SLO_SLOW_REQUEST_MS; else process.env.SLO_SLOW_REQUEST_MS = originalSlowRequest;

  it("falls back safely for malformed observability numbers", () => {
    process.env.OBSERVABILITY_PROBE_TIMEOUT_MS = "NaN";
    process.env.SLO_ERROR_RATE_BUDGET = "NaN";
    process.env.SLO_SLOW_RATE_BUDGET = "Infinity";
    process.env.SLO_SLOW_REQUEST_MS = "bad";
    expect(sloConfig()).toEqual({ errorRateBudget: 0.01, slowRateBudget: 0.05, latencyThresholdMs: 1_000 });
  });
});

describe("production observability contracts", () => {
  it("reports healthy configured provider probes", async () => {
    process.env.OBSERVABILITY_PROBE_URLS = "https://provider.example/health";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("ok", { status: 200 })));
    await expect(checkProviderProbes()).resolves.toMatchObject({ configured: true, ready: true, probes: [{ name: "provider.example", ready: true, status: 200 }] });
  });

  it("reports provider probe failure without leaking response content", async () => {
    process.env.OBSERVABILITY_PROBE_URLS = "https://provider.example/health";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("private provider detail", { status: 503 })));
    await expect(checkProviderProbes()).resolves.toMatchObject({ configured: true, ready: false, probes: [{ ready: false, status: 503, error: "HTTP 503" }] });
  });

  it("bounds SLO configuration values", () => {
    process.env.SLO_ERROR_RATE_BUDGET = "4";
    process.env.SLO_SLOW_RATE_BUDGET = "-1";
    process.env.SLO_SLOW_REQUEST_MS = "999999";
    expect(sloConfig()).toEqual({ errorRateBudget: 1, slowRateBudget: 0, latencyThresholdMs: 60_000 });
  });
});
