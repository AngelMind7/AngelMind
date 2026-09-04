import { describe, expect, it } from "vitest";
import { canExecuteTool } from "./tool-catalog";

describe("governed tool execution policy", () => {
  it("requires server-derived scope validation", () => {
    const result = canExecuteTool({
      toolKey: "dalfox",
      mode: "active_nondestructive",
      scopeValidated: false,
      humanApproval: true,
    });
    expect(result).toEqual({ allowed: false, reason: "scope_not_validated" });
  });

  it("does not allow a client approval boolean to authorize high-risk tools", () => {
    const result = canExecuteTool({
      toolKey: "sqlmap",
      mode: "privileged_or_destructive",
      scopeValidated: true,
      humanApproval: false,
    });
    expect(result).toEqual({
      allowed: false,
      reason: "human_approval_required",
    });
  });

  it("keeps privileged mode exclusive to critical tools", () => {
    const result = canExecuteTool({
      toolKey: "jwt_tool",
      mode: "privileged_or_destructive",
      scopeValidated: true,
      humanApproval: true,
    });
    expect(result).toEqual({
      allowed: false,
      reason: "privileged_mode_blocked",
    });
  });
});
