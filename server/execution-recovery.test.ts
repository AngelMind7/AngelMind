import { describe, expect, it } from "vitest";
import { planExecutionRecovery } from "./execution-recovery";

describe("execution recovery planning", () => {
  const base = { revision: 4, workerLeaseExpired: false, runtimeCompleted: false, runtimeFailed: false, reportGenerated: false } as const;

  it("resumes from a durable non-terminal checkpoint", () => {
    expect(planExecutionRecovery({ ...base, state: "PARSER" })).toMatchObject({ action: "resume", from: "PARSER", next: "NORMALIZER" });
  });

  it("finalizes a worker checkpoint when runtime already completed", () => {
    expect(planExecutionRecovery({ ...base, state: "WORKER_EXECUTION", runtimeCompleted: true })).toMatchObject({ action: "finalize", next: "PARSER" });
  });

  it("retries a failed or expired worker safely", () => {
    expect(planExecutionRecovery({ ...base, state: "WORKER_EXECUTION", runtimeFailed: true })).toMatchObject({ action: "retry" });
    expect(planExecutionRecovery({ ...base, state: "WORKER_EXECUTION", workerLeaseExpired: true })).toMatchObject({ action: "retry" });
  });

  it("holds an active worker rather than duplicating execution", () => {
    expect(planExecutionRecovery({ ...base, state: "WORKER_EXECUTION" })).toMatchObject({ action: "hold" });
  });

  it("treats DONE as immutable", () => {
    expect(planExecutionRecovery({ ...base, state: "DONE" })).toEqual({ action: "noop", from: "DONE", next: null, reason: "execution_already_done" });
  });

  it("rejects invalid revisions", () => {
    expect(() => planExecutionRecovery({ ...base, state: "PARSER", revision: -1 })).toThrow("non-negative integer");
  });
});
