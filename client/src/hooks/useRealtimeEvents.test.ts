import { describe, expect, it } from "vitest";
import { parseSseBlock } from "./useRealtimeEvents";

describe("SSE event parser", () => {
  it("parses id, event name, and JSON data", () => {
    expect(parseSseBlock('id: 42\nevent: finding_validated\ndata: {"id":42}')).toEqual({
      id: 42,
      event: "finding_validated",
      data: '{"id":42}',
    });
  });

  it("joins multiline data and ignores comments as heartbeats", () => {
    expect(parseSseBlock(": heartbeat 123\nid: 7\ndata: first\ndata: second")).toEqual({
      id: 7,
      data: "first\nsecond",
    });
  });

  it("does not invent an id for malformed input", () => {
    expect(parseSseBlock("event: error\ndata: nope")).toEqual({ event: "error", data: "nope" });
  });
});
