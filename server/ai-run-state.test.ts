import { describe, expect, it } from "vitest";
import { isAiRunTerminal } from "./ai-platform";

describe("AI run terminal state", () => {
  it("treats every non-retryable outcome as terminal", () => {
    expect(isAiRunTerminal("completed")).toBe(true);
    expect(isAiRunTerminal("partial")).toBe(true);
    expect(isAiRunTerminal("failed")).toBe(true);
    expect(isAiRunTerminal("cancelled")).toBe(true);
    expect(isAiRunTerminal("queued")).toBe(false);
    expect(isAiRunTerminal("running")).toBe(false);
  });
});

