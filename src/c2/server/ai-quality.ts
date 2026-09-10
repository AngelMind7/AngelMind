type AiRunTiming = {
  status: string;
  costCents: number;
  startedAt: Date | null;
  completedAt: Date | null;
};

export function summarizeAiRuns(runs: AiRunTiming[]) {
  const failedRunCount = runs.filter(run => run.status === "failed").length;
  const measuredLatencies = runs.flatMap(run => run.startedAt && run.completedAt
    ? [Math.max(0, run.completedAt.getTime() - run.startedAt.getTime())]
    : []);
  return {
    runCount: runs.length,
    completedRunCount: runs.filter(run => run.status === "completed" || run.status === "partial").length,
    failedRunCount,
    failureRate: runs.length ? Math.round((failedRunCount / runs.length) * 10000) / 100 : null,
    averageLatencyMs: measuredLatencies.length
      ? Math.round(measuredLatencies.reduce((total, value) => total + value, 0) / measuredLatencies.length)
      : null,
    costCents: runs.reduce((total, run) => total + run.costCents, 0),
  };
}
