import { describe, expect, it } from "vitest";
import { permissionNeedsWorkspaceRole, routedProcedurePermissions } from "./route-permissions";

describe("routed procedure authorization contract", () => {
  it("contains every workspace-scoped operation with an explicit role requirement", () => {
    expect(Object.keys(routedProcedurePermissions)).toHaveLength(107);
    expect(routedProcedurePermissions["operations.addMember"]).toBe("owner");
    expect(routedProcedurePermissions["assurance.decidePolicy"]).toBe("admin-or-distinct-reviewer");
    expect(routedProcedurePermissions["notification.deliveryLedger"]).toBe("self");
    expect(routedProcedurePermissions["assurance.comparePolicies"]).toBe("read-member");
    expect(routedProcedurePermissions["assurance.createIncident"]).toBe("responder");
    expect(routedProcedurePermissions["assurance.incidentReview"]).toBe("read-member");
    expect(routedProcedurePermissions["assurance.saveIncidentReview"]).toBe("responder");
    expect(routedProcedurePermissions["audit.uploadEvidence"]).toBe("owner");
    expect(routedProcedurePermissions["rehearsal.listRuns"]).toBe("read-member");
    expect(routedProcedurePermissions["evidence.duplicateCandidates"]).toBe("read-member");
    expect(routedProcedurePermissions["search.global"]).toBe("read-member");
    expect(routedProcedurePermissions["knowledge.graph"]).toBe("read-member");
    expect(routedProcedurePermissions["knowledge.upsertNode"]).toBe("responder");
    expect(routedProcedurePermissions["research.promoteObservationToFinding"]).toBe("responder");
    expect(routedProcedurePermissions["research.enqueueIntelligenceFetch"]).toBe("responder");
    expect(routedProcedurePermissions["research.playbookRuns"]).toBe("read-member");
    expect(routedProcedurePermissions["research.transitionPlaybookRun"]).toBe("responder");
    expect(routedProcedurePermissions["organization.createSubmission"]).toBe("responder");
    expect(routedProcedurePermissions["tools.run"]).toBe("responder");
    expect(routedProcedurePermissions["ai.startRun"]).toBe("responder");
    expect(routedProcedurePermissions["ai.updateRun"]).toBe("responder");
    expect(routedProcedurePermissions["ai.evaluateRun"]).toBe("distinct-reviewer");
    expect(routedProcedurePermissions["evidence.recordProvenance"]).toBe("responder");
  });
  it("identifies which route types require an explicit workspace role gate", () => {
    expect(permissionNeedsWorkspaceRole("owner")).toBe(true);
    expect(permissionNeedsWorkspaceRole("read-member")).toBe(true);
    expect(permissionNeedsWorkspaceRole("self")).toBe(false);
    expect(permissionNeedsWorkspaceRole("authenticated")).toBe(false);
  });
});
