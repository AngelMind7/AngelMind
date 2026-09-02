import { afterEach, describe, expect, it, vi } from "vitest";
import { checkProviderProbes, sloConfig } from "./observability";

const originalUrls = process.env.OBSERVABILITY_PROBE_URLS;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalUrls === undefined) delete process.env.OBSERVABILITY_PROBE_URLS;
  else process.env.OBSERVABILITY_PROBE_URLS = originalUrls;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
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
