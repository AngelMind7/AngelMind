import { describe, expect, it } from "vitest";
import { createAiWorker, getAiWorker, listPrompts, registerPrompt, runAiWorker, setAiWorkerEnabled } from "./ai-automation";

describe("AI automation", () => {
  it("creates bounded workers and defaults to simulation", () => {
    const worker = createAiWorker({ workspaceId: 101, name: "Research Worker", role: "research", modelKey: "test-model", budgetCents: 500, timeoutSeconds: 30 });
    expect(worker.mode).toBe("simulation");
    expect(worker.enabled).toBe(true);
    expect(worker.budgetCents).toBe(500);
    expect(getAiWorker(worker.id).workspaceId).toBe(101);
  });

  it("rejects disabled workers and over-budget runs", async () => {
    const worker = createAiWorker({ workspaceId: 102, name: "Triage Worker", role: "triage", modelKey: "test-model", budgetCents: 10, timeoutSeconds: 30 });
    setAiWorkerEnabled(worker.id, false);
    await expect(runAiWorker({ userId: 1, workerId: worker.id, purpose: "test", inputReference: "fixture://input" })).rejects.toThrow(/disabled/);
    setAiWorkerEnabled(worker.id, true);
    await expect(runAiWorker({ userId: 1, workerId: worker.id, purpose: "test", inputReference: "fixture://input", estimatedCostCents: 11 })).rejects.toThrow(/budget/);
  });

  it("keeps prompt versions reproducible and activates only the newest version", () => {
    const first = registerPrompt({ name: "quality-check", template: "v1" });
    const second = registerPrompt({ name: "quality-check", template: "v2" });
    expect(first.version).toBe(1);
    expect(first.active).toBe(false);
    expect(second.version).toBe(2);
    expect(second.active).toBe(true);
    expect(listPrompts("quality-check").map(p => p.version)).toEqual([2, 1]);
  });
});
