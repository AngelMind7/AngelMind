import { describe, expect, it } from "vitest";
import {
  approveRedTeamOperation, buildC2SimulationPolicy, createRedTeamOperation, createSimulatedImplant,
  createSimulatedPhishingCampaign, queueSimulatedCommand, recordSimulatedBeacon, recordSimulatedClick,
  requestRedTeamApproval, simulatePhishingSend, simulateRedTeamCapability,
} from "./redteam-operations";

function approvedOperation(ownerUserId: number) {
  const operation = createRedTeamOperation(ownerUserId, {
    name: "Authorized lab exercise",
    objective: "Validate detection coverage against a synthetic red-team scenario",
    workspaceId: 1,
    allowedTargets: ["lab.example.invalid"],
    exclusions: ["production.example.invalid"],
    startAt: new Date("2026-09-05T00:00:00Z"),
    endAt: new Date("2026-09-05T02:00:00Z"),
    rulesOfEngagement: "Synthetic lab only; no production traffic; all actions audited.",
  });
  requestRedTeamApproval(ownerUserId, operation.id);
  approveRedTeamOperation(ownerUserId, operation.id);
  return operation;
}

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

  it("keeps implant and beacon lifecycle synthetic", () => {
    const operation = approvedOperation(902);
    const implant = createSimulatedImplant(902, operation.id, "linux");
    expect(implant).toMatchObject({ simulationOnly: true, status: "generated" });
    expect(recordSimulatedBeacon(902, implant.id)).toMatchObject({ received: true, mode: "simulation", targetExecutionEnabled: false });
    expect(queueSimulatedCommand(902, implant.id, "health_check")).toMatchObject({ status: "simulated" });
  });

  it("keeps phishing delivery synthetic and never collects credentials", () => {
    const operation = approvedOperation(903);
    const campaign = createSimulatedPhishingCampaign(903, operation.id, { name: "Synthetic awareness exercise" });
    expect(simulatePhishingSend(903, campaign.id)).toMatchObject({ delivered: false, simulated: true, targetExecutionEnabled: false });
    expect(recordSimulatedClick(903, campaign.id)).toMatchObject({ tracked: true, simulated: true, credentialCollection: false });
  });
});
