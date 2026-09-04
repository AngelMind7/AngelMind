export interface Env {
  ENVIRONMENT: string;
  TURNSTILE_SITE_KEY: string;
  RATE_LIMIT_KV: KVNamespace;
  SESSION_KV: KVNamespace;
  CACHE_KV: KVNamespace;
  PROXY_POOL_KV: KVNamespace;
  EXECUTION_STATE_KV: KVNamespace;
  EVIDENCE_BUCKET: R2Bucket;
  REPORTS_BUCKET: R2Bucket;
  TOOL_OUTPUT_BUCKET: R2Bucket;
  BACKUPS_BUCKET: R2Bucket;
  EDGE_DB: D1Database;
  EXECUTION_ROOMS: DurableObjectNamespace;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff" },
});

export class ExecutionRoom {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method === "GET") {
      return json({ ok: true, room: this.state.id.toString(), state: "edge-realtime-ready" });
    }
    if (request.method === "POST") {
      const payload = await request.json().catch(() => null);
      await this.state.storage.put("last_event", payload ?? { type: "empty" });
      return json({ ok: true, persisted: true });
    }
    return json({ error: true, code: "METHOD_NOT_ALLOWED" }, 405);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, service: "angelmind-edge", environment: env.ENVIRONMENT });
    if (request.method === "GET" && url.pathname === "/status") return json({ ok: true, edge: "configured", backend: "provider-routed", realtime: "durable-object" });
    if (url.pathname.startsWith("/edge/realtime/")) {
      const roomId = url.pathname.slice("/edge/realtime/".length).trim();
      if (!roomId || roomId.length > 128) return json({ error: true, code: "INVALID_ROOM_ID" }, 400);
      const id = env.EXECUTION_ROOMS.idFromName(roomId);
      return env.EXECUTION_ROOMS.get(id).fetch(request);
    }
    return json({ error: true, code: "EDGE_ROUTE_NOT_CONFIGURED" }, 404);
  },
};
