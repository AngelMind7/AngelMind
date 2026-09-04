import { describe, expect, it, vi } from "vitest";

vi.mock("./tool-runtime", () => ({
  checkRegisteredAdapterHealth: vi.fn(),
}));
vi.mock("./tool-execution-policy", () => ({
  authorizeToolExecution: vi.fn(),
}));
vi.mock("./tool-execution-pipeline", () => ({
  executeToolPipeline: vi.fn(),
}));

import { checkRegisteredAdapterHealth } from "./tool-runtime";
import { authorizeToolExecution } from "./tool-execution-policy";
import { executeToolPipeline } from "./tool-execution-pipeline";
import { executeGovernedCapability } from "./governed-execution-service";

const health = vi.mocked(checkRegisteredAdapterHealth);
const authorize = vi.mocked(authorizeToolExecution);
const pipeline = vi.mocked(executeToolPipeline);

describe("executeGovernedCapability", () => {
  it("fails closed for an unknown capability before runtime execution", async () => {
    const result = await executeGovernedCapability({
      userId: 1,
      workspaceId: 2,
      capability: "not-a-master-capability",
      mode: "passive_readonly",
      input: "example.com",
    });
    expect(result).toEqual({ status: "blocked", reason: "capability_not_found", plan: null });
    expect(health).not.toHaveBeenCalled();
    expect(authorize).not.toHaveBeenCalled();
  });

  it("selects a healthy fallback, then still performs server-side authorization", async () => {
    health.mockResolvedValue([
      { toolKey: "ffuf", binary: "ffuf", available: false },
      { toolKey: "burp_suite_pro", binary: "burp-rest-cli", available: true },
    ]);
    authorize.mockResolvedValue({
      allowed: true,
      scopeDigest: "scope-digest",
      riskClass: "medium",
      target: "example.com",
      humanApproval: false,
    });
    pipeline.mockResolvedValue({
      runtime: { requestId: "req-1", status: "completed", exitCode: 0, stdout: "{}", stderr: "", durationMs: 1 },
      phases: ["validate", "prepare", "execute", "collect", "parse", "normalize", "cleanup"],
      rawOutputSha256: "a".repeat(64),
      parsedRecords: [{}],
      evidence: null,
      correlation: null,
      provenance: { toolKey: "burp_suite_pro", requestId: "req-1", acquisition: "passive_readonly", rawOutputSha256: "a".repeat(64), normalizedEvidenceSha256: null },
    });

    const result = await executeGovernedCapability({
      userId: 1,
      workspaceId: 2,
      capability: "parameter-manipulation",
      mode: "passive_readonly",
      target: "example.com",
      input: "example.com",
    });

    expect(result.status).toBe("completed");
    expect(result.plan.toolKey).toBe("burp_suite_pro");
    expect(authorize).toHaveBeenCalledWith(expect.objectContaining({ toolKey: "burp_suite_pro", workspaceId: 2, userId: 1 }));
    expect(pipeline).toHaveBeenCalledWith(expect.objectContaining({ toolKey: "burp_suite_pro", scopeValidated: true, humanApproval: false }));
  });

  it("does not execute when every adapter for a capability is unavailable", async () => {
    health.mockResolvedValue([
      { toolKey: "sqlmap", binary: "sqlmap", available: false },
      { toolKey: "burp_suite_pro", binary: "burp-rest-cli", available: false },
    ]);

    const result = await executeGovernedCapability({
      userId: 1,
      workspaceId: 2,
      capability: "sql-injection-testing",
      mode: "active_nondestructive",
      target: "example.com",
      input: "example.com",
    });

    expect(result.status).toBe("blocked");
    expect(result.reason).toBe("no_healthy_tool_adapter");
    expect(authorize).not.toHaveBeenCalled();
    expect(pipeline).not.toHaveBeenCalled();
  });
});
