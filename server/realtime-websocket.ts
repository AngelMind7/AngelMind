import type { IncomingMessage, Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { sdk } from "./_core/sdk";
import { parseEventEnvelope, type EventEnvelope } from "./event-contract";
import { getDb } from "./db";
import { and, asc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { outboxEvents, workspaceMemberships, workspaces } from "../drizzle/schema";

const WS_PATH = "/api/events/ws";
const POLL_INTERVAL_MS = 3_000;
const MAX_EVENTS_PER_POLL = 50;
const MAX_LAST_EVENT_ID = 2_147_483_647;
type StreamEvent = EventEnvelope & { id: number };

function parseLastEventId(req: IncomingMessage) {
  const raw = req.headers["last-event-id"] ?? new URL(req.url ?? WS_PATH, "http://localhost").searchParams.get("lastEventId") ?? "0";
  const parsed = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= MAX_LAST_EVENT_ID ? parsed : 0;
}

async function accessibleWorkspaceIds(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [owned, memberships] = await Promise.all([
    db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.ownerUserId, userId)),
    db.select({ workspaceId: workspaceMemberships.workspaceId }).from(workspaceMemberships).where(eq(workspaceMemberships.userId, userId)),
  ]);
  return Array.from(new Set([...owned.map(row => row.id), ...memberships.map(row => row.workspaceId)]));
}

async function loadEvents(userId: number, afterId: number) {
  const db = await getDb();
  if (!db) return null;
  const workspaceIds = await accessibleWorkspaceIds(userId);
  if (!workspaceIds) return null;
  if (!workspaceIds.length) return [];
  const rows = await db.select().from(outboxEvents).where(and(gt(outboxEvents.id, afterId), or(isNull(outboxEvents.workspaceId), inArray(outboxEvents.workspaceId, workspaceIds)), eq(outboxEvents.status, "published"))).orderBy(asc(outboxEvents.id)).limit(MAX_EVENTS_PER_POLL);
  return rows.flatMap(row => {
    try {
      const parsed = parseEventEnvelope({ id: row.id, eventType: row.eventType, aggregateType: row.aggregateType, aggregateId: row.aggregateId, schemaVersion: row.schemaVersion, payload: JSON.parse(row.payload) });
      return parsed && parsed.id === row.id ? [{ ...parsed, id: row.id }] : [];
    } catch { return []; }
  });
}

export function registerRealtimeWebSocket(server: Server) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });
  server.on("upgrade", async (request, socket, head) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (url.pathname !== WS_PATH) return;
    try {
      const user = await sdk.authenticateRequest(request as never);
      if (!user) { socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n"); socket.destroy(); return; }
      wss.handleUpgrade(request, socket, head, ws => wss.emit("connection", ws, request, user.id));
    } catch { socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n"); socket.destroy(); }
  });
  wss.on("connection", (ws: WebSocket, request: IncomingMessage, userId: number) => {
    let lastEventId = parseLastEventId(request);
    let closed = false;
    const send = (event: StreamEvent) => { if (ws.readyState === WebSocket.OPEN) { ws.send(JSON.stringify(event)); lastEventId = event.id; } };
    const poll = async () => { if (closed) return; const events = await loadEvents(userId, lastEventId); if (events === null) { ws.close(1011, "Database unavailable"); return; } for (const event of events) send(event); };
    const timer = setInterval(() => void poll().catch(() => ws.close(1011, "Event polling failed")), POLL_INTERVAL_MS);
    void poll();
    ws.on("close", () => { closed = true; clearInterval(timer); });
    ws.on("error", () => { closed = true; clearInterval(timer); });
  });
  return wss;
}
