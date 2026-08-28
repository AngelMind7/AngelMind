import { describe, expect, it } from "vitest";
import { permissionNeedsWorkspaceRole, routedProcedurePermissions } from "./route-permissions";

describe("routed procedure authorization contract", () => {
  it("contains every workspace-scoped operation with an explicit role requirement", () => {
    expect(Object.keys(routedProcedurePermissions)).toHaveLength(50);
    expect(routedProcedurePermissions["operations.addMember"]).toBe("owner");
    expect(routedProcedurePermissions["assurance.decidePolicy"]).toBe("admin-or-distinct-reviewer");
    expect(routedProcedurePermissions["assurance.createIncident"]).toBe("responder");
    expect(routedProcedurePermissions["audit.uploadEvidence"]).toBe("owner");
    expect(routedProcedurePermissions["rehearsal.listRuns"]).toBe("read-member");
  });
  it("identifies which route types require an explicit workspace role gate", () => {
    expect(permissionNeedsWorkspaceRole("owner")).toBe(true);
    expect(permissionNeedsWorkspaceRole("read-member")).toBe(true);
    expect(permissionNeedsWorkspaceRole("self")).toBe(false);
    expect(permissionNeedsWorkspaceRole("authenticated")).toBe(false);
  });
});
