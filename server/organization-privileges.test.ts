import { describe, expect, it } from "vitest";
import { organizationPrivilegeMatrix } from "./organization";

describe("organization privilege matrix", () => {
  it("keeps privilege families separated by role", () => {
    expect(organizationPrivilegeMatrix.owner).toContain("organization.manage");
    expect(organizationPrivilegeMatrix.admin).toContain("members.manage");
    expect(organizationPrivilegeMatrix.researcher).toContain("research.execute");
    expect(organizationPrivilegeMatrix.reviewer).toContain("findings.review");
    expect(organizationPrivilegeMatrix.auditor).toContain("audit.read");
    expect(organizationPrivilegeMatrix.researcher).not.toContain("members.manage");
    expect(organizationPrivilegeMatrix.auditor).not.toContain("scope.manage");
  });
});
