const baseUrl = (process.env.LOAD_TEST_BASE_URL ?? "").replace(/\/$/, "");
const concurrency = Math.min(50, Math.max(1, Number(process.env.LOAD_TEST_CONCURRENCY ?? 10)));
const durationMs = Math.min(120_000, Math.max(1_000, Number(process.env.LOAD_TEST_DURATION_MS ?? 15_000)));
const timeoutMs = Math.min(10_000, Math.max(500, Number(process.env.LOAD_TEST_TIMEOUT_MS ?? 3_000)));
const maxErrorRate = Math.min(1, Math.max(0, Number(process.env.LOAD_TEST_MAX_ERROR_RATE ?? 0.02)));

if (!baseUrl || !/^https:\/\//i.test(baseUrl)) {
  console.error("LOAD_TEST_BASE_URL must be an explicit HTTPS staging URL.");
  process.exit(1);
}
if (/production|prod\.|localhost|127\.0\.0\.1/i.test(baseUrl)) {
  console.error("Refusing production or local load-test target; use an explicit staging URL.");
  process.exit(1);
}

const startedAt = Date.now();
let requests = 0;
let failures = 0;
let latencyTotal = 0;
let maxLatency = 0;

async function probe() {
  const requestStarted = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}/healthz`, { signal: controller.signal, headers: { accept: "application/json" } });
    const latency = Date.now() - requestStarted;
    requests += 1;
    latencyTotal += latency;
    maxLatency = Math.max(maxLatency, latency);
    if (!response.ok) failures += 1;
  } catch {
    requests += 1;
    failures += 1;
  } finally {
    clearTimeout(timer);
  }
}

async function worker() {
  while (Date.now() < startedAt + durationMs) await probe();
}
await Promise.all(Array.from({ length: concurrency }, worker));
const errorRate = requests ? failures / requests : 1;
const summary = { baseUrl, concurrency, durationMs, requests, failures, errorRate, averageLatencyMs: requests ? Math.round(latencyTotal / requests) : null, maxLatencyMs: maxLatency };
console.log(JSON.stringify(summary, null, 2));
if (requests === 0 || errorRate > maxErrorRate) process.exit(1);
