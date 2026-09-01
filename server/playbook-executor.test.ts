import { describe, expect, it } from "vitest";
import { selectDependencyReadyTask } from "./playbook-executor";

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
});
