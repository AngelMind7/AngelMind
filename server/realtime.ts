import type { Express, Request, Response } from "express";
import { and, asc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { outboxEvents, workspaceMemberships, workspaces } from "../drizzle/schema";
import { getDb } from "./db";
import { sdk } from "./_core/sdk";
import { parseEventEnvelope, type EventEnvelope } from "./event-contract";

const POLL_INTERVAL_MS = 3_000;
const HEARTBEAT_INTERVAL_MS = 15_000;
const MAX_EVENTS_PER_POLL = 50;
const MAX_LAST_EVENT_ID = 2_147_483_647;

type StreamEvent = EventEnvelope & { id: number };

function writeEvent(res: Response, event: StreamEvent) {
  res.write(`id: ${event.id}\n`);
  res.write(`event: ${event.eventType}\n`);
  res.write(`data: ${JSON.stringify({
    id: event.id,
    eventType: event.eventType,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    schemaVersion: event.schemaVersion,
    payload: event.payload,
  })}\n\n`);
}

function parseLastEventId(req: Request) {
  const raw = req.get("last-event-id") ?? req.query.lastEventId;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= MAX_LAST_EVENT_ID ? parsed : 0;
}

async function getAccessibleWorkspaceIds(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [owned, memberships] = await Promise.all([
    db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.ownerUserId, userId)),
    db.select({ workspaceId: workspaceMemberships.workspaceId }).from(workspaceMemberships).where(eq(workspaceMemberships.userId, userId)),
  ]);
  return Array.from(new Set([
    ...owned.map(row => row.id),
    ...memberships.map(row => row.workspaceId),
  ]));
}

async function loadEvents(userId: number, afterId: number) {
  const db = await getDb();
  if (!db) return null;
  const workspaceIds = await getAccessibleWorkspaceIds(userId);
  if (!workspaceIds) return null;
  if (workspaceIds.length === 0) return [];
  const rows = await db.select().from(outboxEvents)
    .where(and(
      gt(outboxEvents.id, afterId),
      or(isNull(outboxEvents.workspaceId), inArray(outboxEvents.workspaceId, workspaceIds)),
      eq(outboxEvents.status, "published"),
    ))
    .orderBy(asc(outboxEvents.id))
    .limit(MAX_EVENTS_PER_POLL);
  return rows.flatMap(row => {
    try {
      const parsed = parseEventEnvelope({
        id: row.id,
        eventType: row.eventType,
        aggregateType: row.aggregateType,
        aggregateId: row.aggregateId,
        schemaVersion: row.schemaVersion,
        payload: JSON.parse(row.payload),
      });
      if (!parsed || parsed.id !== row.id) return [];
      return [{
        id: row.id,
        eventType: parsed.eventType,
        aggregateType: parsed.aggregateType,
        aggregateId: parsed.aggregateId,
        schemaVersion: parsed.schemaVersion,
        payload: parsed.payload,
      }];
    } catch {
      return [];
    }
  });
}

export function registerRealtimeRoutes(app: Express) {
  app.get("/api/events/stream", async (req, res) => {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const initialEvents = await loadEvents(user.id, parseLastEventId(req));
    if (initialEvents === null) {
      res.status(503).json({ error: "Database tidak tersedia." });
      return;
    }

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    let lastEventId = parseLastEventId(req);
    let closed = false;
    let polling = false;
    const sendHeartbeat = () => {
      if (!closed) res.write(`: heartbeat ${Date.now()}\n\n`);
    };
    const poll = async () => {
      if (closed || polling) return;
      polling = true;
      try {
        const events = await loadEvents(user.id, lastEventId);
        if (events === null) {
          if (!closed) res.write(`event: error\ndata: ${JSON.stringify({ error: "Database tidak tersedia." })}\n\n`);
          return;
        }
        for (const event of events) {
          if (closed) break;
          writeEvent(res, event);
          lastEventId = event.id;
        }
      } catch (error) {
        console.error("[Realtime] Event stream poll failed", error);
      } finally {
        polling = false;
      }
    };

    const pollTimer = setInterval(() => void poll(), POLL_INTERVAL_MS);
    const heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    req.on("close", () => {
      closed = true;
      clearInterval(pollTimer);
      clearInterval(heartbeatTimer);
    });

    for (const event of initialEvents) {
      writeEvent(res, event);
      lastEventId = event.id;
    }
    sendHeartbeat();
  });
}
