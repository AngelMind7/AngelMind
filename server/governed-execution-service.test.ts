import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./tool-runtime", () => ({ checkRegisteredAdapterHealth: vi.fn() }));
vi.mock("./tool-execution-policy", () => ({ authorizeToolExecution: vi.fn() }));
vi.mock("./tool-execution-pipeline", () => ({ executeToolPipeline: vi.fn() }));

import { checkRegisteredAdapterHealth } from "./tool-runtime";
import { authorizeToolExecution } from "./tool-execution-policy";
import { executeToolPipeline } from "./tool-execution-pipeline";
import { executeGovernedCapability } from "./governed-execution-service";

const health = vi.mocked(checkRegisteredAdapterHealth);
const authorize = vi.mocked(authorizeToolExecution);
const pipeline = vi.mocked(executeToolPipeline);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("executeGovernedCapability", () => {
  it("fails closed for an unknown capability before runtime execution", async () => {
    const result = await executeGovernedCapability({ userId: 1, workspaceId: 2, capability: "not-a-master-capability", mode: "passive_readonly", input: "example.com" });
    expect(result).toEqual({ status: "blocked", reason: "capability_not_found", plan: null, state: "VECTOR_SELECTION" });
    expect(health).not.toHaveBeenCalled();
    expect(authorize).not.toHaveBeenCalled();
  });

  it("selects a healthy fallback, then still performs server-side authorization", async () => {
    health.mockResolvedValue([
      { toolKey: "ffuf", binary: "ffuf", available: false },
      { toolKey: "burp_suite_pro", binary: "burp-rest-cli", available: true },
    ]);
    authorize.mockResolvedValue({ allowed: false, reason: "scope_not_validated", humanApproval: false });

    const result = await executeGovernedCapability({
      userId: 1,
      workspaceId: 2,
      capability: "parameter-manipulation",
      mode: "passive_readonly",
      target: "example.com",
      input: "example.com",
    });

    expect(result.status).toBe("blocked");
    expect(result.plan.toolKey).toBe("burp_suite_pro");
    expect(result.reason).toBe("scope_not_validated");
    expect(authorize).toHaveBeenCalledWith(expect.objectContaining({ toolKey: "burp_suite_pro", workspaceId: 2, userId: 1 }));
    expect(pipeline).not.toHaveBeenCalled();
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