import { describe, expect, it } from "vitest";
import { permissionNeedsWorkspaceRole, routedProcedurePermissions } from "./route-permissions";

describe("routed procedure authorization contract", () => {
  it("contains every workspace-scoped operation with an explicit role requirement", () => {
    expect(Object.keys(routedProcedurePermissions)).toHaveLength(72);
    expect(routedProcedurePermissions["operations.addMember"]).toBe("owner");
    expect(routedProcedurePermissions["assurance.decidePolicy"]).toBe("admin-or-distinct-reviewer");
    expect(routedProcedurePermissions["assurance.createIncident"]).toBe("responder");
    expect(routedProcedurePermissions["audit.uploadEvidence"]).toBe("owner");
    expect(routedProcedurePermissions["rehearsal.listRuns"]).toBe("read-member");
    expect(routedProcedurePermissions["evidence.duplicateCandidates"]).toBe("read-member");
    expect(routedProcedurePermissions["search.global"]).toBe("read-member");
    expect(routedProcedurePermissions["knowledge.graph"]).toBe("read-member");
    expect(routedProcedurePermissions["knowledge.upsertNode"]).toBe("responder");
    expect(routedProcedurePermissions["organization.createSubmission"]).toBe("responder");
  });
  it("identifies which route types require an explicit workspace role gate", () => {
    expect(permissionNeedsWorkspaceRole("owner")).toBe(true);
    expect(permissionNeedsWorkspaceRole("read-member")).toBe(true);
    expect(permissionNeedsWorkspaceRole("self")).toBe(false);
    expect(permissionNeedsWorkspaceRole("authenticated")).toBe(false);
  });
});
