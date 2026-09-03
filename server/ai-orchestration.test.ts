import { describe, expect, it } from "vitest";
import { assignReadyTasks, crossCheckObservations, planMultiAgentRun, synthesizeObservations, synthesizeOrchestratedAiResults } from "./ai-orchestration";

describe("AI orchestration contracts", () => {
  it("plans ordered tasks with scope as the root", () => {
    const plan = planMultiAgentRun({ objective: "Assess evidence for a workspace finding", roles: ["risk", "scope", "evidence"] });
    expect(plan.tasks.map(task => task.role)).toEqual(["scope", "evidence", "risk"]);
    expect(plan.tasks[0]?.status).toBe("queued");
    expect(plan.tasks[1]?.dependsOn).toEqual(["scope-1"]);
  });

  it("assigns ready tasks without exceeding capacity", () => {
    const plan = planMultiAgentRun({ objective: "Assess evidence for a workspace finding", roles: ["scope", "evidence"] });
    expect(assignReadyTasks(plan.tasks, 1).map(task => task.id)).toEqual(["scope-1"]);
  });

  it("requires review when agent conclusions conflict", () => {
    const result = crossCheckObservations([
      { taskId: "scope-1", role: "scope", conclusion: "in scope", confidence: 0.9, evidenceReferences: ["asset:1"] },
      { taskId: "risk-1", role: "risk", conclusion: "out of scope", confidence: 0.8, evidenceReferences: ["asset:1"] },
    ]);
    expect(result.verdict).toBe("needs_review");
    expect(result.conflicts).toHaveLength(1);
  });

  it("synthesizes only sufficiently confident observations and preserves references", () => {
    const result = synthesizeObservations([
      { taskId: "scope-1", role: "scope", conclusion: "asset is eligible", confidence: 0.9, evidenceReferences: ["asset:1"] },
      { taskId: "risk-1", role: "risk", conclusion: "low risk", confidence: 0.4, evidenceReferences: ["asset:2"] },
    ]);
    expect(result.acceptedCount).toBe(1);
    expect(result.evidenceReferences).toEqual(["asset:1"]);
    expect(result.requiresHumanReview).toBe(false);
  });

  it("exposes the governed result pipeline with provenance and review state", () => {
    const result = synthesizeOrchestratedAiResults([
      {
        runId: "run-1",
        taskId: "evidence-1",
        modelId: "model-1",
        input: "Review passive evidence",
        findings: [{ key: "finding-a", conclusion: "supported", confidence: 0.9, evidenceReferences: ["evidence/1"] }],
      },
      {
        runId: "run-1",
        taskId: "risk-1",
        modelId: "model-2",
        input: "Review passive evidence",
        findings: [{ key: "finding-a", conclusion: "supported", confidence: 0.8, evidenceReferences: ["evidence/2"] }],
      },
    ]);
    expect(result.findings[0]?.requiresHumanReview).toBe(false);
    expect(result.findings[0]?.evidenceReferences).toEqual(["evidence/1", "evidence/2"]);
    expect(result.provenance).toHaveLength(2);
    expect(result.provenance[0]?.inputHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.provenance[0]?.outputHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
