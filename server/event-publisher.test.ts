import { describe, expect, it } from "vitest";
import { prepareEvent, serializeEvent } from "./event-publisher";

describe("event publisher contract", () => {
  const base = {
    eventType: "research.progress" as const,
    aggregateType: "research",
    aggregateId: 42,
    schemaVersion: 1,
    payload: { progress: 50 },
  };

  it("normalizes and freezes valid events", () => {
    const event = prepareEvent({ ...base, aggregateType: "  research  " });
    expect(event.aggregateType).toBe("research");
    expect(Object.isFrozen(event)).toBe(true);
  });

  it("rejects unsupported event types", () => {
    expect(() => prepareEvent({ ...base, eventType: "unknown.event" as never })).toThrow();
  });

  it("rejects invalid aggregate identifiers", () => {
    expect(() => prepareEvent({ ...base, aggregateId: 0 })).toThrow();
    expect(() => prepareEvent({ ...base, aggregateId: 1.5 })).toThrow();
  });

  it("rejects oversized payloads by UTF-8 byte size", () => {
    expect(() => prepareEvent({ ...base, payload: { data: "é".repeat(140_000) } })).toThrow("256 KiB");
  });

  it("serializes only validated events", () => {
    expect(JSON.parse(serializeEvent(base))).toMatchObject(base);
  });
});
