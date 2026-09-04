import { and, eq } from "drizzle-orm";
import { outboxEvents } from "../drizzle/schema";
import { getDb } from "./db";
import { prepareEvent, type EventPublishInput } from "./event-publisher";

export async function publishExecutionProgress(input: {
  workspaceId: number;
  jobId: number;
  requestId: string;
  capability: string;
  toolKey: string;
  state: string;
  revision: number;
  terminalReason?: string;
}) {
  const eventType: EventPublishInput["eventType"] = input.state === "QUEUE"
    ? "execution.queued"
    : input.state === "WORKER_EXECUTION"
      ? "execution.started"
      : input.state === "DONE"
        ? (input.terminalReason?.includes("failed") ? "execution.failed" : "execution.completed")
        : "execution.started";

  const event = prepareEvent({
    eventType,
    aggregateType: "execution",
    aggregateId: input.jobId,
    schemaVersion: 1,
    payload: {
      jobId: input.jobId,
      requestId: input.requestId,
      capability: input.capability,
      toolKey: input.toolKey,
      state: input.state,
      revision: input.revision,
      terminalReason: input.terminalReason ?? null,
    },
  });

  const db = await getDb();
  if (!db) return { published: false, reason: "database_unavailable" } as const;

  const idempotencyKey = `execution-progress:${input.jobId}:${input.revision}`;
  const [existing] = await db.select({ id: outboxEvents.id }).from(outboxEvents)
    .where(and(eq(outboxEvents.idempotencyKey, idempotencyKey)))
    .limit(1);
  if (existing) return { published: false, duplicate: true, eventId: existing.id } as const;

  const result = await db.insert(outboxEvents).values({
    workspaceId: input.workspaceId,
    eventType: event.eventType,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    schemaVersion: event.schemaVersion,
    payload: JSON.stringify(event.payload),
    status: "published",
    idempotencyKey,
  });

  const eventId = Number(result[0]?.insertId ?? 0);
  return { published: true, eventId: eventId > 0 ? eventId : undefined } as const;
}
