import { describe, expect, it } from "vitest";
import { ownerMembershipRecord, roleAllowsWorkspaceAccess } from "./operations";

describe("workspace membership access", () => {
  it("gives owners full control, scoped roles read access, and only reviewers review access", () => {
    expect(roleAllowsWorkspaceAccess("owner", "manage")).toBe(true);
    expect(roleAllowsWorkspaceAccess("operator", "read")).toBe(true);
    expect(roleAllowsWorkspaceAccess("auditor", "read")).toBe(true);
    expect(roleAllowsWorkspaceAccess("reviewer", "review")).toBe(true);
    expect(roleAllowsWorkspaceAccess("operator", "review")).toBe(false);
    expect(roleAllowsWorkspaceAccess("auditor", "manage")).toBe(false);
  });

  it("creates an owner bootstrap record that cannot grant authority to another user", () => {
    expect(ownerMembershipRecord(91, 17)).toEqual({ workspaceId: 91, userId: 17, role: "owner", addedByUserId: 17 });
    expect(roleAllowsWorkspaceAccess("operator", "manage")).toBe(false);
  });
});
