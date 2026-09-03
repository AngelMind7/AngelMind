import { z } from "zod";

export const realtimeEventTypes = [
  "research.started",
  "research.progress",
  "research.completed",
  "execution.queued",
  "execution.started",
  "execution.completed",
  "execution.failed",
  "finding.created",
  "correlation.chain_detected",
] as const;

export const eventTypeSchema = z.enum(realtimeEventTypes);

const MAX_PAYLOAD_BYTES = 256 * 1024;

export const eventEnvelopeSchema = z.object({
  id: z.number().int().positive().optional(),
  eventType: eventTypeSchema,
  aggregateType: z.string().trim().min(2).max(80),
  aggregateId: z.number().int().positive(),
  schemaVersion: z.number().int().min(1).max(100),
  payload: z.record(z.string(), z.unknown()),
});

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;

export function assertEventType(eventType: string): (typeof realtimeEventTypes)[number] {
  const result = eventTypeSchema.safeParse(eventType);
  if (!result.success) throw new Error(`Unsupported realtime event type: ${eventType}`);
  return result.data;
}

export function assertEventPayload(payload: unknown): Record<string, unknown> {
  const result = z.record(z.string(), z.unknown()).safeParse(payload);
  if (!result.success) throw new Error("Realtime event payload must be a JSON object.");
  const normalized = result.data;
  const encoded = JSON.stringify(normalized);
  if (new TextEncoder().encode(encoded).byteLength > MAX_PAYLOAD_BYTES) {
    throw new Error("Realtime event payload exceeds the size limit (256 KiB).");
  }
  return normalized;
}

export function parseEventEnvelope(input: unknown): EventEnvelope | null {
  const result = eventEnvelopeSchema.safeParse(input);
  if (!result.success) return null;
  try {
    return { ...result.data, eventType: assertEventType(result.data.eventType), payload: assertEventPayload(result.data.payload) };
  } catch {
    return null;
  }
}
