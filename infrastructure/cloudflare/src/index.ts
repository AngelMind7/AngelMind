export interface Env {
  ENVIRONMENT: string;
  RATE_LIMIT_KV: KVNamespace;
  SESSION_KV: KVNamespace;
  CACHE_KV: KVNamespace;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff" },
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, service: "angelmind-edge", environment: env.ENVIRONMENT });
    if (request.method === "GET" && url.pathname === "/status") return json({ ok: true, edge: "configured", backend: "provider-routed" });
    return json({ error: true, code: "EDGE_ROUTE_NOT_CONFIGURED" }, 404);
  },
};
