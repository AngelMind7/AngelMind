import express from "express";
import { describe, expect, it } from "vitest";
import { registerHealthRoutes, registerMetricsRoute, registerSecurityMiddleware } from "./security";

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

  it("exposes process metrics in Prometheus text format", async () => {
    const app = express();
    registerMetricsRoute(app);
    const response = await request(app, "/metrics");
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(body).toContain("# TYPE angelmind_process_uptime_seconds gauge");
    expect(body).toContain("angelmind_process_memory_bytes{category=\"rss\"}");
  });

  it("reports readiness in development without requiring a database", async () => {
    const app = express();
    registerHealthRoutes(app);
    const response = await request(app, "/readyz");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ready" });
  });
});
