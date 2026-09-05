import type { Express, Request, Response, NextFunction } from "express";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { checkRuntimeReadiness } from "./tool-runtime";
import { renderPurgeMetrics } from "./purge-metrics";
import { randomUUID } from "node:crypto";
import { withTraceContext } from "./_core/trace-context";
import { checkProviderProbes, sloConfig } from "./observability";
import { evaluateRequiredProductionCapabilities } from "./production-readiness";

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  // Firebase Google popup authentication needs the opener relationship preserved.
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  "Cross-Origin-Resource-Policy": "same-origin",
};

const requestMetrics = { total: 0, errors: 0, totalDurationMs: 0, slow: 0, statuses: new Map<number, number>() };

export function registerSecurityMiddleware(app: Express) {
  app.disable("x-powered-by");
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();
    const requestId = req.header("x-request-id")?.trim().slice(0, 128) || randomUUID();
    const traceId = req.header("x-trace-id")?.trim().slice(0, 128) || requestId;
    res.setHeader("x-request-id", requestId);
    res.setHeader("x-trace-id", traceId);
    requestMetrics.total += 1;
    res.on("finish", () => {
      const duration = Date.now() - startedAt;
      requestMetrics.totalDurationMs += duration;
      requestMetrics.statuses.set(res.statusCode, (requestMetrics.statuses.get(res.statusCode) ?? 0) + 1);
      if (res.statusCode >= 500) requestMetrics.errors += 1;
      if (duration >= 1_000) requestMetrics.slow += 1;
    });
    for (const [name, value] of Object.entries(securityHeaders)) res.setHeader(name, value);
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      res.setHeader("Content-Security-Policy", [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https:",
        "worker-src 'self' blob:",
      ].join("; "));
    }
    void withTraceContext({ requestId, traceId }, async () => next());
  });
}

export function registerHealthRoutes(app: Express) {
  app.get("/healthz", (_req, res) => res.status(200).json({ status: "ok" }));
  app.get("/readyz", async (_req, res) => {
    const databaseConfigured = Boolean(process.env.DATABASE_URL);
    let databaseReachable = false;
    if (databaseConfigured) {
      try {
        const db = await getDb();
        if (db) {
          await Promise.race([db.execute(sql`SELECT 1`), new Promise((_, reject) => setTimeout(() => reject(new Error("readiness timeout")), 2_000))]);
          databaseReachable = true;
        }
      } catch {
        databaseReachable = false;
      }
    }
    const runtime = await checkRuntimeReadiness();
    const providers = await checkProviderProbes();
    const requiredCapabilities = evaluateRequiredProductionCapabilities({ databaseConfigured, databaseReachable, runtime, providers });
    const ready = process.env.NODE_ENV !== "production" ? true : databaseConfigured && databaseReachable && runtime.ready && providers.ready && requiredCapabilities.ready;
    res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not-ready", databaseConfigured, databaseReachable, runtime, providers, requiredCapabilities });
  });
}

function metricName(value: string) {
  return value.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function registerMetricsRoute(app: Express) {
  app.get("/metrics", async (_req, res) => {
    const memory = process.memoryUsage();
    const runtime = await checkRuntimeReadiness();
    const providers = await checkProviderProbes();
    const slo = sloConfig();
    const errorRate = requestMetrics.total ? requestMetrics.errors / requestMetrics.total : 0;
    const slowRate = requestMetrics.total ? requestMetrics.slow / requestMetrics.total : 0;
    const lines = [
      "# HELP angelmind_process_uptime_seconds Process uptime in seconds.",
      "# TYPE angelmind_process_uptime_seconds gauge",
      `angelmind_process_uptime_seconds ${process.uptime()}`,
      "# HELP angelmind_database_configured Whether DATABASE_URL is configured.",
      "# TYPE angelmind_database_configured gauge",
      `angelmind_database_configured ${process.env.DATABASE_URL ? 1 : 0}`,
      "# HELP angelmind_worker_enabled Whether this process runs the durable worker.",
      "# TYPE angelmind_worker_enabled gauge",
      `angelmind_worker_enabled ${process.env.RUN_WORKER === "true" ? 1 : 0}`,
      "# HELP angelmind_runtime_ready Whether configured runtime binaries are available and registered.",
      "# TYPE angelmind_runtime_ready gauge",
      `angelmind_runtime_ready ${runtime.ready ? 1 : 0}`,
      "# HELP angelmind_http_requests_total Total HTTP requests observed by this process.",
      "# TYPE angelmind_http_requests_total counter",
      `angelmind_http_requests_total ${requestMetrics.total}`,
      "# HELP angelmind_http_errors_total Total HTTP 5xx responses observed by this process.",
      "# TYPE angelmind_http_errors_total counter",
      `angelmind_http_errors_total ${requestMetrics.errors}`,
      "# HELP angelmind_http_slow_requests_total Requests taking at least one second.",
      "# TYPE angelmind_http_slow_requests_total counter",
      `angelmind_http_slow_requests_total ${requestMetrics.slow}`,
      "# HELP angelmind_http_request_duration_ms_total Sum of observed request durations.",
      "# TYPE angelmind_http_request_duration_ms_total counter",
      `angelmind_http_request_duration_ms_total ${requestMetrics.totalDurationMs}`,
      "# HELP angelmind_http_requests_by_status_total Total HTTP requests by response status.",
      "# TYPE angelmind_http_requests_by_status_total counter",
      ...Array.from(requestMetrics.statuses.entries()).map(([status, count]) => `angelmind_http_requests_by_status_total{status="${status}"} ${count}`),
      "# HELP angelmind_http_error_rate Current in-process HTTP 5xx ratio.",
      "# TYPE angelmind_http_error_rate gauge",
      `angelmind_http_error_rate ${errorRate}`,
      "# HELP angelmind_http_slow_rate Current in-process slow-request ratio.",
      "# TYPE angelmind_http_slow_rate gauge",
      `angelmind_http_slow_rate ${slowRate}`,
      "# HELP angelmind_slo_error_budget_ok Whether current error ratio is within configured SLO budget.",
      "# TYPE angelmind_slo_error_budget_ok gauge",
      `angelmind_slo_error_budget_ok ${errorRate <= slo.errorRateBudget ? 1 : 0}`,
      "# HELP angelmind_slo_slow_budget_ok Whether current slow-request ratio is within configured SLO budget.",
      "# TYPE angelmind_slo_slow_budget_ok gauge",
      `angelmind_slo_slow_budget_ok ${slowRate <= slo.slowRateBudget ? 1 : 0}`,
      "# HELP angelmind_provider_probe_ready Whether configured provider probes are healthy.",
      "# TYPE angelmind_provider_probe_ready gauge",
      `angelmind_provider_probe_ready ${providers.ready ? 1 : 0}`,
      "# HELP angelmind_process_memory_bytes Node.js process memory by category.",
      "# TYPE angelmind_process_memory_bytes gauge",
      ...Object.entries(memory).map(([category, value]) => `angelmind_process_memory_bytes{category=\"${metricName(category)}\"} ${value}`),
      renderPurgeMetrics(),
    ];
    res.type("text/plain; version=0.0.4").send(`${lines.join("\\n")}\\n`);
  });
}
