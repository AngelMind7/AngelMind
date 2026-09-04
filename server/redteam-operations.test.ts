import { describe, expect, it } from "vitest";
import {
  approveRedTeamOperation,
  buildC2SimulationPolicy,
  createRedTeamOperation,
  requestRedTeamApproval,
  simulateRedTeamCapability,
} from "./redteam-operations";

describe("governed red-team operations", () => {
  it("requires approval before a simulation can run", () => {
    const operation = createRedTeamOperation(901, {
      name: "Authorized lab exercise",
      objective: "Validate detection coverage against a synthetic red-team scenario",
      workspaceId: 1,
      allowedTargets: ["lab.example.invalid"],
      exclusions: ["production.example.invalid"],
      startAt: new Date("2026-09-05T00:00:00Z"),
      endAt: new Date("2026-09-05T02:00:00Z"),
      rulesOfEngagement: "Synthetic lab only; no production traffic; all actions audited.",
    });
    expect(simulateRedTeamCapability({ ownerUserId: 901, operationId: operation.id, capability: "c2", approval: "approved" }).ok).toBe(false);
    requestRedTeamApproval(901, operation.id);
    approveRedTeamOperation(901, operation.id);
    const result = simulateRedTeamCapability({ ownerUserId: 901, operationId: operation.id, capability: "c2", approval: "approved" });
    expect(result).toMatchObject({ ok: true, mode: "simulation", synthetic: true, targetExecutionEnabled: false });
  });

  it("keeps C2 explicitly fail-closed", () => {
    expect(buildC2SimulationPolicy()).toEqual({ mode: "simulation", targetExecutionEnabled: false, approvalRequired: true, auditRequired: true });
  });
});
