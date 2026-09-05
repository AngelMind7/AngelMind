import { describe, expect, it } from "vitest";
import { assertDependencyGraphAcyclic, validateResearchHypothesisInput, validateResearchTaskDefinition } from "./research-validation";

describe("research lifecycle validation", () => {
  it("normalizes a valid task and removes duplicate dependencies", () => {
    expect(validateResearchTaskDefinition({ type: "passive-observe", title: "Collect certificate metadata", priority: 80, dependencies: [2, 2, 3] })).toEqual({
      type: "passive-observe",
      title: "Collect certificate metadata",
      priority: 80,
      dependencies: [2, 3],
    });
  });

  it("rejects malformed task definitions and self-dependencies", () => {
    expect(() => validateResearchTaskDefinition({ type: "", title: "x", priority: 10, dependencies: [] })).toThrow(/type/i);
    expect(() => validateResearchTaskDefinition({ type: "observe", title: "Valid title", priority: 101, dependencies: [] })).toThrow(/priority/i);
    expect(() => validateResearchTaskDefinition({ taskId: 4, type: "observe", title: "Valid title", priority: 10, dependencies: [4] })).toThrow(/itself/i);
  });

  it("requires bounded hypothesis content and priority", () => {
    expect(validateResearchHypothesisInput({ description: "Certificate points to shared service", reason: "The issuer and SAN set suggest shared infrastructure.", priority: 70 })).toEqual({
      description: "Certificate points to shared service",
      reason: "The issuer and SAN set suggest shared infrastructure.",
      priority: 70,
    });
    expect(() => validateResearchHypothesisInput({ description: "x", reason: "why", priority: 0 })).toThrow(/description/i);
    expect(() => validateResearchHypothesisInput({ description: "valid hypothesis", reason: "x", priority: 0 })).toThrow(/reason/i);
  });

  it("rejects cycles in the persisted dependency graph", () => {
    expect(() => assertDependencyGraphAcyclic([
      { taskId: 2, dependsOnTaskId: 1 },
      { taskId: 3, dependsOnTaskId: 2 },
    ])).not.toThrow();
    expect(() => assertDependencyGraphAcyclic([
      { taskId: 1, dependsOnTaskId: 3 },
      { taskId: 2, dependsOnTaskId: 1 },
      { taskId: 3, dependsOnTaskId: 2 },
    ])).toThrow(/cycle/i);
  });
});

