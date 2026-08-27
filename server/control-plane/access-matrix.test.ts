import { describe, expect, it } from "vitest";
import { exposedWorkspaceActionMatrix, roleIsPermittedForExposedAction } from "./access-matrix";

describe("exposed workspace action matrix", () => {
  it("defines a role requirement for every exposed workspace action category", () => {
    expect(exposedWorkspaceActionMatrix).toHaveLength(7);
    expect(exposedWorkspaceActionMatrix.every(row => row.allowed.length > 0)).toBe(true);
  });
  it("keeps management owner-only while constraining review and response roles", () => {
    expect(roleIsPermittedForExposedAction("operator", "manage")).toBe(false);
    expect(roleIsPermittedForExposedAction("reviewer", "review")).toBe(true);
    expect(roleIsPermittedForExposedAction("auditor", "respond")).toBe(false);
    expect(roleIsPermittedForExposedAction("owner", "manage")).toBe(true);
  });
});
