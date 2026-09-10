import { describe, expect, it } from "vitest";
import { summarizeAiRuns } from "./ai-quality";

describe("AI quality summary", () => {
  it("calculates failure rate, average measured latency, terminal runs, and cost", () => {
    const now = new Date("2026-09-02T00:00:00.000Z");
    expect(summarizeAiRuns([
      { status: "completed", costCents: 12, startedAt: now, completedAt: new Date(now.getTime() + 100) },
      { status: "partial", costCents: 8, startedAt: now, completedAt: new Date(now.getTime() + 300) },
      { status: "failed", costCents: 3, startedAt: null, completedAt: null },
      { status: "running", costCents: 1, startedAt: now, completedAt: null },
    ])).toEqual({ runCount: 4, completedRunCount: 2, failedRunCount: 1, failureRate: 25, averageLatencyMs: 200, costCents: 24 });
  });

  it("returns null metrics when there are no runs or measured timestamps", () => {
    expect(summarizeAiRuns([])).toMatchObject({ runCount: 0, failureRate: null, averageLatencyMs: null, costCents: 0 });
    expect(summarizeAiRuns([{ status: "queued", costCents: 0, startedAt: null, completedAt: null }])).toMatchObject({ failureRate: 0, averageLatencyMs: null });
  });
});
