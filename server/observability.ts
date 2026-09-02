export type ProviderProbeResult = { name: string; url: string; ready: boolean; status: number | null; latencyMs: number | null; error?: string };

function configuredProbes() {
  return (process.env.OBSERVABILITY_PROBE_URLS ?? "").split(",").map(item => item.trim()).filter(Boolean).slice(0, 20).map(raw => {
    const url = new URL(raw);
    if (url.protocol !== "https:" && process.env.NODE_ENV === "production") throw new Error("OBSERVABILITY_PROBE_URLS must use HTTPS in production.");
    return url;
  });
}

export async function checkProviderProbes() {
  const timeoutMs = Math.min(10_000, Math.max(500, Number(process.env.OBSERVABILITY_PROBE_TIMEOUT_MS ?? 2_000)));
  const urls = configuredProbes();
  const results: ProviderProbeResult[] = await Promise.all(urls.map(async url => {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { method: "GET", signal: controller.signal, headers: { accept: "application/health+json, application/json, text/plain" } });
      return { name: url.hostname, url: url.origin, ready: response.ok, status: response.status, latencyMs: Date.now() - startedAt, ...(response.ok ? {} : { error: `HTTP ${response.status}` }) };
    } catch (error) {
      return { name: url.hostname, url: url.origin, ready: false, status: null, latencyMs: Date.now() - startedAt, error: error instanceof Error ? error.message.slice(0, 200) : "probe failed" };
    } finally { clearTimeout(timer); }
  }));
  return { configured: urls.length > 0, ready: results.every(result => result.ready), probes: results };
}

export function sloConfig() {
  return {
    errorRateBudget: Math.min(1, Math.max(0, Number(process.env.SLO_ERROR_RATE_BUDGET ?? 0.01))),
    slowRateBudget: Math.min(1, Math.max(0, Number(process.env.SLO_SLOW_RATE_BUDGET ?? 0.05))),
    latencyThresholdMs: Math.min(60_000, Math.max(100, Number(process.env.SLO_SLOW_REQUEST_MS ?? 1_000))),
  };
}
