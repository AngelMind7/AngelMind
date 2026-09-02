import type { Express, Request, Response, NextFunction } from "express";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { checkRuntimeReadiness } from "./tool-runtime";
import { renderPurgeMetrics } from "./purge-metrics";

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  // Firebase Google popup authentication needs the opener relationship preserved.
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  "Cross-Origin-Resource-Policy": "same-origin",
};

const requestMetrics = { total: 0, errors: 0, totalDurationMs: 0, slow: 0 };

export function registerSecurityMiddleware(app: Express) {
  app.disable("x-powered-by");
  app.use((_req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();
    requestMetrics.total += 1;
    res.on("finish", () => {
      const duration = Date.now() - startedAt;
      requestMetrics.totalDurationMs += duration;
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
    next();
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
    const ready = process.env.NODE_ENV !== "production" ? true : databaseConfigured && databaseReachable && runtime.ready;
    res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not-ready", databaseConfigured, databaseReachable, runtime });
  });
}

function metricName(value: string) {
  return value.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function registerMetricsRoute(app: Express) {
  app.get("/metrics", async (_req, res) => {
    const memory = process.memoryUsage();
    const runtime = await checkRuntimeReadiness();
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
      "# HELP angelmind_process_memory_bytes Node.js process memory by category.",
      "# TYPE angelmind_process_memory_bytes gauge",
      ...Object.entries(memory).map(([category, value]) => `angelmind_process_memory_bytes{category=\"${metricName(category)}\"} ${value}`),
      renderPurgeMetrics(),
    ];
    res.type("text/plain; version=0.0.4").send(`${lines.join("\\n")}\\n`);
  });
}
