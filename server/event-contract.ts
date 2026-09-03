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

export const eventEnvelopeSchema = z.object({
  id: z.number().int().positive().optional(),
  eventType: eventTypeSchema,
  aggregateType: z.string().trim().min(2).max(80),
  aggregateId: z.number().int().positive(),
  schemaVersion: z.number().int().min(1).max(100),
  payload: z.record(z.string(), z.unknown()),
});

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;

export function parseEventEnvelope(input: unknown): EventEnvelope | null {
  const result = eventEnvelopeSchema.safeParse(input);
  return result.success ? result.data : null;
}

export function assertEventType(eventType: string): (typeof realtimeEventTypes)[number] {
  const result = eventTypeSchema.safeParse(eventType);
  if (!result.success) throw new Error(`Unsupported realtime event type: ${eventType}`);
  return result.data;
}

export function assertEventPayload(payload: unknown): Record<string, unknown> {
  const result = z.record(z.string(), z.unknown()).safeParse(payload);
  if (!result.success) throw new Error("Realtime event payload must be a JSON object.");
  return result.data;
}
