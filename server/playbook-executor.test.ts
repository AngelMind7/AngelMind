import { describe, expect, it } from "vitest";
import {
  hasDependencyCycle,
  playbookJobPayload,
  reconcileCompletedTaskIds,
  selectDependencyReadyTask,
} from "./playbook-executor";
import {
  executePassiveAdapter,
  assertPassivePlaybookTaskType,
} from "./control-plane/intelligence-engine";

describe("playbook executor planning", () => {
  it("selects only dependency-ready queued tasks", () => {
    const task = selectDependencyReadyTask(
      [
        { id: 1, status: "completed", priority: 1 },
        { id: 2, status: "queued", priority: 10 },
        { id: 3, status: "queued", priority: 100 },
      ],
      [{ taskId: 3, dependsOnTaskId: 2 }],
      new Set([1])
    );
    expect(task?.id).toBe(2);
  });

  it("uses priority and then id as deterministic tie breakers", () => {
    const task = selectDependencyReadyTask(
      [
        { id: 8, status: "queued", priority: 40 },
        { id: 7, status: "queued", priority: 40 },
        { id: 9, status: "blocked", priority: 100 },
      ],
      [],
      new Set()
    );
    expect(task?.id).toBe(7);
  });

  it("allows only registered passive adapters", () => {
    expect(executePassiveAdapter("metadata-review", { target: "example.test" })).toMatchObject({
      adapterKey: "metadata-review",
      status: "completed",
      networkCalls: 0,
    });
    expect(() => executePassiveAdapter("sqlmap", {})).toThrow(/not registered|safety boundary/i);
  });

  it("rejects target-facing playbook task vocabulary", () => {
    expect(() => assertPassivePlaybookTaskType("exploit-validation")).toThrow();
    expect(() => assertPassivePlaybookTaskType("credential-review")).toThrow();
    expect(assertPassivePlaybookTaskType("metadata-review")).toBe("metadata-review");
  });

  it("reconciles stale checkpoint IDs to the current run", () => {
    expect(reconcileCompletedTaskIds([10, 20], [10, 999, 10])).toEqual(new Set([10]));
  });

  it("detects dependency cycles", () => {
    expect(
      hasDependencyCycle(
        [10, 20, 30],
        [
          { taskId: 20, dependsOnTaskId: 10 },
          { taskId: 30, dependsOnTaskId: 20 },
          { taskId: 10, dependsOnTaskId: 30 },
        ]
      )
    ).toBe(true);
  });

  it("ignores dependencies outside the current run when checking cycles", () => {
    expect(hasDependencyCycle([10, 20], [{ taskId: 20, dependsOnTaskId: 999 }])).toBe(false);
  });

  it("creates the canonical durable worker payload", () => {
    expect(playbookJobPayload(42)).toEqual({ type: "playbook_run", runId: 42 });
  });
});
