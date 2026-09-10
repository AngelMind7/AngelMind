import { describe, expect, it } from "vitest";
import { shouldIndexWorkspaceNote } from "./global-search";

describe("workspace note privacy contract", () => {
  it("keeps private notes out of workspace-wide search", () => {
    expect(shouldIndexWorkspaceNote("private")).toBe(false);
    expect(shouldIndexWorkspaceNote("workspace")).toBe(true);
  });
});
