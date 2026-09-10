import express from "express";
import { describe, expect, it } from "vitest";
import { registerHealthRoutes, registerMetricsRoute, registerSecurityMiddleware } from "./security";
import { PURGE_DURATION_ALERT_MS, recordPurgeBatch, resetPurgeMetrics } from "./purge-metrics";

async function request(app: express.Express, path: string) {
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not expose a port");
  try {
    return await fetch(`http://127.0.0.1:${address.port}${path}`);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

describe("security and health contracts", () => {
  it("sets baseline security headers and serves health checks", async () => {
    const app = express();
    registerSecurityMiddleware(app);
    registerHealthRoutes(app);
    const response = await request(app, "/healthz");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("permissions-policy")).toContain("camera=()");
  });

  it("propagates bounded request and trace correlation headers", async () => {
    const app = express();
    registerSecurityMiddleware(app);
    app.get("/", (_req, res) => res.status(200).send("ok"));
    const server = app.listen(0);
    await new Promise<void>(resolve => server.once("listening", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not expose a port");
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/`, { headers: { "x-request-id": "request-test", "x-trace-id": "trace-test" } });
      expect(response.headers.get("x-request-id")).toBe("request-test");
      expect(response.headers.get("x-trace-id")).toBe("trace-test");
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  it("exposes process metrics in Prometheus text format", async () => {
    const app = express();
    registerMetricsRoute(app);
    const response = await request(app, "/metrics");
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(body).toContain("# TYPE angelmind_process_uptime_seconds gauge");
    expect(body).toContain("angelmind_process_memory_bytes{category=\"rss\"}");
    expect(body).toContain("# TYPE angelmind_purge_batch_duration_ms gauge");
    expect(body).toContain("angelmind_purge_duration_alert 0");
  });

  it("exposes HTTP request and slow-request counters", async () => {
    const app = express();
    registerSecurityMiddleware(app);
    app.get("/", (_req, res) => res.status(200).send("ok"));
    registerMetricsRoute(app);
    await request(app, "/");
    const body = await (await request(app, "/metrics")).text();
    expect(body).toContain("angelmind_http_requests_total");
    expect(body).toContain("angelmind_http_errors_total");
    expect(body).toContain("angelmind_http_slow_requests_total");
  });

  it("records purge duration and exposes a threshold alert", () => {
    resetPurgeMetrics();
    recordPurgeBatch(PURGE_DURATION_ALERT_MS + 1, 500);
    const app = express();
    registerMetricsRoute(app);
    return request(app, "/metrics").then(async response => {
      const body = await response.text();
      expect(body).toContain("angelmind_purge_batches_total 1");
      expect(body).toContain("angelmind_purge_records_total 500");
      expect(body).toContain(`angelmind_purge_batch_duration_ms ${PURGE_DURATION_ALERT_MS + 1}`);
      expect(body).toContain("angelmind_purge_duration_alert 1");
      resetPurgeMetrics();
    });
  });

  it("fails production readiness when a required runtime binary is unavailable", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousRequiredBinaries = process.env.RUNTIME_REQUIRED_BINARIES;
    process.env.NODE_ENV = "production";
    process.env.RUNTIME_REQUIRED_BINARIES = "missing-runtime-binary";
    try {
      const app = express();
      registerHealthRoutes(app);
      const response = await request(app, "/readyz");
      const body = await response.json();
      expect(response.status).toBe(503);
      expect(body).toMatchObject({ status: "not-ready", runtime: { configured: true, ready: false, missing: ["missing-runtime-binary"] } });
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
      if (previousRequiredBinaries === undefined) delete process.env.RUNTIME_REQUIRED_BINARIES;
      else process.env.RUNTIME_REQUIRED_BINARIES = previousRequiredBinaries;
    }
  });

  it("reports readiness in development without requiring a database", async () => {
    const app = express();
    registerHealthRoutes(app);
    const response = await request(app, "/readyz");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ready" });
  });

  it("serves a public status snapshot without exposing readiness internals", async () => {
    const app = express();
    registerHealthRoutes(app);
    const response = await request(app, "/statusz");
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: "operational", publicPosture: "target_interaction_disabled" });
    expect(body.components).toMatchObject({ api: { status: "operational" } });
    expect(body.databaseConfigured).toBeUndefined();
    expect(body.providers).toBeUndefined();
  });
});
