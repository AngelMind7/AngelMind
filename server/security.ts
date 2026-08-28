import type { Express, Request, Response, NextFunction } from "express";

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

export function registerSecurityMiddleware(app: Express) {
  app.disable("x-powered-by");
  app.use((_req: Request, res: Response, next: NextFunction) => {
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
  app.get("/readyz", (_req, res) => {
    const ready = Boolean(process.env.NODE_ENV !== "production" || process.env.DATABASE_URL);
    res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not-ready", databaseConfigured: Boolean(process.env.DATABASE_URL) });
  });
}

function metricName(value: string) {
  return value.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function registerMetricsRoute(app: Express) {
  app.get("/metrics", (_req, res) => {
    const memory = process.memoryUsage();
    const lines = [
      "# HELP angelmind_process_uptime_seconds Process uptime in seconds.",
      "# TYPE angelmind_process_uptime_seconds gauge",
      `angelmind_process_uptime_seconds ${process.uptime()}`,
      "# HELP angelmind_process_memory_bytes Node.js process memory by category.",
      "# TYPE angelmind_process_memory_bytes gauge",
      ...Object.entries(memory).map(([category, value]) => `angelmind_process_memory_bytes{category=\"${metricName(category)}\"} ${value}`),
    ];
    res.type("text/plain; version=0.0.4").send(`${lines.join("\\n")}\\n`);
  });
}
