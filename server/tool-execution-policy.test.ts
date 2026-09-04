import { beforeEach, describe, expect, it, vi } from "vitest";

const getToolExecutionContext = vi.fn();
const listApprovals = vi.fn();
const getToolCatalogEntry = vi.fn();
const canExecuteTool = vi.fn();
const adapterRequiresTargetScope = vi.fn();

vi.mock("./control-plane/service", () => ({
  getToolExecutionContext,
  listApprovals,
}));

vi.mock("./tool-catalog", () => ({
  getToolCatalogEntry,
  canExecuteTool,
}));

vi.mock("./tool-runtime", () => ({
  adapterRequiresTargetScope,
}));

import { authorizeToolExecution } from "./tool-execution-policy";
import { canExecuteTool as realCanExecuteTool } from "./tool-catalog";

describe("governed tool execution policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ANGELMIND_ENABLE_TARGET_EXECUTION;
    getToolExecutionContext.mockResolvedValue({
      allowed: true,
      workspaceId: 10,
      allowlist: ["example.com"],
      exclusions: [],
      scopeDigest: "scope-123",
    });
    getToolCatalogEntry.mockReturnValue({
      id: "dalfox",
      riskClass: "high",
    });
    adapterRequiresTargetScope.mockReturnValue(true);
    canExecuteTool.mockReturnValue({ allowed: true });
    listApprovals.mockResolvedValue([]);
  });

  it("requires server-derived scope validation", () => {
    const result = realCanExecuteTool({
      toolKey: "dalfox",
      mode: "active_nondestructive",
      scopeValidated: false,
      humanApproval: true,
    });
    expect(result).toEqual({ allowed: false, reason: "scope_not_validated" });
  });

  it("does not allow a client approval boolean to authorize high-risk tools", () => {
    const result = realCanExecuteTool({
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
    const result = realCanExecuteTool({
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

  it("blocks a target outside the server-derived workspace scope", async () => {
    const result = await authorizeToolExecution({
      userId: 1,
      workspaceId: 10,
      toolKey: "dalfox",
      mode: "active_nondestructive",
      target: "evil.example.net",
      input: "evil.example.net",
    });
    expect(result).toEqual({ allowed: false, reason: "target_out_of_scope" });
    expect(canExecuteTool).not.toHaveBeenCalled();
  });

  it("blocks active target execution while the deployment gate is disabled", async () => {
    const result = await authorizeToolExecution({
      userId: 1,
      workspaceId: 10,
      toolKey: "dalfox",
      mode: "active_nondestructive",
      target: "example.com",
      input: "example.com",
    });
    expect(result).toEqual({
      allowed: false,
      reason: "target_execution_disabled",
    });
    expect(canExecuteTool).not.toHaveBeenCalled();
  });

  it("requires an approval record for high-risk execution", async () => {
    process.env.ANGELMIND_ENABLE_TARGET_EXECUTION = "true";
    const result = await authorizeToolExecution({
      userId: 1,
      workspaceId: 10,
      toolKey: "dalfox",
      mode: "active_nondestructive",
      target: "example.com",
      input: "example.com",
    });
    expect(result).toEqual({
      allowed: false,
      reason: "human_approval_required",
    });
  });

  it("rejects an expired or non-approved approval record", async () => {
    process.env.ANGELMIND_ENABLE_TARGET_EXECUTION = "true";
    listApprovals.mockResolvedValue([
      {
        id: 77,
        status: "rejected",
        workspaceId: 10,
        actionName: "privileged_proof",
        expiresAt: new Date(Date.now() + 60_000),
        contextJson: JSON.stringify({
          toolId: "dalfox",
          mode: "active_nondestructive",
          scopeDigest: "scope-123",
          target: "example.com",
        }),
      },
    ]);
    const result = await authorizeToolExecution({
      userId: 1,
      workspaceId: 10,
      toolKey: "dalfox",
      mode: "active_nondestructive",
      target: "example.com",
      input: "example.com",
      approvalId: 77,
    });
    expect(result).toEqual({ allowed: false, reason: "approval_not_approved" });
  });

  it("allows a valid approved high-risk execution and derives approval server-side", async () => {
    process.env.ANGELMIND_ENABLE_TARGET_EXECUTION = "true";
    listApprovals.mockResolvedValue([
      {
        id: 77,
        status: "approved",
        workspaceId: 10,
        actionName: "privileged_proof",
        expiresAt: new Date(Date.now() + 60_000),
        contextJson: JSON.stringify({
          toolId: "dalfox",
          mode: "active_nondestructive",
          scopeDigest: "scope-123",
          target: "example.com",
        }),
      },
    ]);
    const result = await authorizeToolExecution({
      userId: 1,
      workspaceId: 10,
      toolKey: "dalfox",
      mode: "active_nondestructive",
      target: "example.com",
      input: "example.com",
      approvalId: 77,
    });
    expect(result).toEqual({
      allowed: true,
      scopeDigest: "scope-123",
      riskClass: "high",
      target: "example.com",
      humanApproval: true,
    });
    expect(canExecuteTool).toHaveBeenCalledWith({
      toolKey: "dalfox",
      mode: "active_nondestructive",
      scopeValidated: true,
      humanApproval: true,
    });
  });
});
