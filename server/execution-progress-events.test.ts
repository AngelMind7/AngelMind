import { describe, expect, it } from "vitest";
import { prepareEvent } from "./event-publisher";

describe("execution progress event contract", () => {
  it("accepts governed execution progress events", () => {
    const event = prepareEvent({
      eventType: "execution.progress",
      aggregateType: "execution",
      aggregateId: 42,
      schemaVersion: 1,
      payload: {
        jobId: 42,
        requestId: "request-42",
        capability: "passive_inventory",
        toolKey: "inventory.passive",
        state: "EVIDENCE",
        revision: 7,
      },
    });
    expect(event.eventType).toBe("execution.progress");
    expect(event.payload.state).toBe("EVIDENCE");
  });

  it("keeps progress payloads bounded and structured", () => {
    const event = prepareEvent({
      eventType: "execution.progress",
      aggregateType: "execution",
      aggregateId: 1,
      schemaVersion: 1,
      payload: { state: "REPORT_GENERATION", revision: 12 },
    });
    expect(Object.keys(event.payload)).toEqual(["state", "revision"]);
  });
});
