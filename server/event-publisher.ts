import {
  assertEventPayload,
  assertEventType,
  type EventEnvelope,
} from "./event-contract";

const MAX_PAYLOAD_BYTES = 256 * 1024;

function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

export type EventPublishInput = Omit<EventEnvelope, "id"> & {
  id?: number;
};

/**
 * Validates and freezes an event before it can be handed to an outbox/bus.
 * This module deliberately performs no transport or network I/O.
 */
export function prepareEvent(input: EventPublishInput): EventEnvelope {
  if (!input || typeof input !== "object") {
    throw new Error("Realtime event is required.");
  }

  const eventType = assertEventType(input.eventType);
  const aggregateType = input.aggregateType.trim();
  if (aggregateType.length < 2 || aggregateType.length > 80) {
    throw new Error("Realtime event aggregate type is invalid.");
  }
  if (!Number.isInteger(input.aggregateId) || input.aggregateId <= 0) {
    throw new Error("Realtime event aggregate ID is invalid.");
  }
  if (!Number.isInteger(input.schemaVersion) || input.schemaVersion < 1 || input.schemaVersion > 100) {
    throw new Error("Realtime event schema version is invalid.");
  }

  const payload = assertEventPayload(input.payload);
  const serializedPayload = JSON.stringify(payload);
  if (byteLength(serializedPayload) > MAX_PAYLOAD_BYTES) {
    throw new Error("Realtime event payload exceeds the 256 KiB limit.");
  }

  const event: EventEnvelope = {
    ...(input.id === undefined ? {} : { id: input.id }),
    eventType,
    aggregateType,
    aggregateId: input.aggregateId,
    schemaVersion: input.schemaVersion,
    payload,
  };

  return Object.freeze(event);
}

export function serializeEvent(event: EventEnvelope): string {
  const prepared = prepareEvent(event);
  return JSON.stringify(prepared);
}
