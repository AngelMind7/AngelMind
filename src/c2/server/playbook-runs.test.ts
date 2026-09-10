import { describe, expect, it } from "vitest";
import { assertPlaybookRunTransition } from "./research-intelligence";

describe("durable playbook run transitions", () => {
  it("allows pause, resume, completion, and retry from failed", () => {
    expect(() => assertPlaybookRunTransition("queued", "running")).not.toThrow();
    expect(() => assertPlaybookRunTransition("running", "paused")).not.toThrow();
    expect(() => assertPlaybookRunTransition("paused", "running")).not.toThrow();
    expect(() => assertPlaybookRunTransition("running", "completed")).not.toThrow();
    expect(() => assertPlaybookRunTransition("failed", "queued")).not.toThrow();
  });

  it("rejects transitions out of terminal states and invalid skips", () => {
    expect(() => assertPlaybookRunTransition("completed", "running")).toThrow(/tidak dapat berpindah/i);
    expect(() => assertPlaybookRunTransition("cancelled", "queued")).toThrow(/tidak dapat berpindah/i);
    expect(() => assertPlaybookRunTransition("queued", "completed")).toThrow(/tidak dapat berpindah/i);
  });
});
