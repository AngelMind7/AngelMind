import { describe, expect, it } from "vitest";
import { validatePersistedNodeTransition } from "./persisted-orchestration";

describe("persisted orchestration graph state contract", () => {
  it("requires evidence before a node can complete", () => {
    expect(() => validatePersistedNodeTransition("running", "completed")).toThrow(/evidence hash/);
    expect(validatePersistedNodeTransition("running", "completed", "a".repeat(64))).toBe(true);
  });
  it("rejects transitions out of terminal nodes", () => {
    expect(() => validatePersistedNodeTransition("completed", "running")).toThrow(/Terminal/);
    expect(() => validatePersistedNodeTransition("failed", "needs_review")).toThrow(/Terminal/);
  });
  it("allows non-terminal review and running transitions", () => {
    expect(validatePersistedNodeTransition("queued", "running")).toBe(true);
    expect(validatePersistedNodeTransition("running", "needs_review")).toBe(true);
  });
});
