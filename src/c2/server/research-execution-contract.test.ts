import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("research execution contract", () => {
  it("keeps persisted task approval distinct from execution authorization", () => {
    const source = readFileSync(new URL("./research-execution-service.ts", import.meta.url), "utf8");
    expect(source).toContain("task.approvalStatus === \"pending\"");
    expect(source).toContain("const approvalId = task.approvalId ?? inputApprovalId");
    expect(source).toContain("if (highRisk && !approvalId)");
    expect(source).toContain("approval_record_required");
  });

  it("does not turn a governed policy block into a task failure", () => {
    const source = readFileSync(new URL("./research-execution-service.ts", import.meta.url), "utf8");
    expect(source).toContain('execution.status === "blocked"');
    expect(source).toContain('transitionResearchTask(userId, task.id, "paused"');
  });
});
