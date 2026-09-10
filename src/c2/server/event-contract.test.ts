import { describe, expect, it } from "vitest";
import { assertEventPayload, assertEventType, parseEventEnvelope } from "./event-contract";

describe("versioned realtime event contract", () => {
  it("accepts the master event envelope", () => {
    expect(parseEventEnvelope({
      id: 12,
      eventType: "finding.created",
      aggregateType: "finding",
      aggregateId: 9,
      schemaVersion: 1,
      payload: { severity: "high" },
    })).toMatchObject({ id: 12, eventType: "finding.created", schemaVersion: 1 });
  });

  it("rejects unknown event types before they enter the outbox", () => {
    expect(() => assertEventType("internal.debug_event")).toThrow("Unsupported realtime event type");
  });

  it("requires an object payload", () => {
    expect(assertEventPayload({ event: "ok" })).toEqual({ event: "ok" });
    expect(() => assertEventPayload(["not-an-object"])).toThrow("payload must be a JSON object");
  });

  it("rejects oversized payloads", () => {
    expect(() => assertEventPayload({ data: "x".repeat(256 * 1024) })).toThrow("exceeds the size limit");
  });

  it("rejects malformed persisted envelopes", () => {
    expect(parseEventEnvelope({ id: 2, eventType: "finding.created", aggregateType: "finding", aggregateId: 1, schemaVersion: 0, payload: {} })).toBeNull();
  });
});
