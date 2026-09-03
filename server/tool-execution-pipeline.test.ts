import { describe, expect, it } from "vitest";
import { executeToolPipeline, isLifecycleComplete } from "./tool-execution-pipeline";

describe("tool execution pipeline", () => {
  it("records every adapter lifecycle phase and provenance for an offline adapter", async () => {
    const result = await executeToolPipeline({
      toolKey: "custom_scripts",
      mode: "offline_artifact",
      scopeValidated: true,
      humanApproval: false,
      input: "{\"hello\":\"world\"}",
      capabilities: ["source-code-review"],
    });
    expect(isLifecycleComplete(result.phases)).toBe(true);
    expect(result.provenance.toolKey).toBe("custom_scripts");
    expect(result.provenance.requestId).toBe(result.runtime.requestId);
    if (result.evidence) expect(result.evidence.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("blocks target-facing execution unless deployment opt-in is explicit", async () => {
    const previous = process.env.ANGELMIND_ENABLE_TARGET_EXECUTION;
    delete process.env.ANGELMIND_ENABLE_TARGET_EXECUTION;
    const result = await executeToolPipeline({
      toolKey: "jwt_tool",
      mode: "active_nondestructive",
      scopeValidated: true,
      humanApproval: true,
      input: "https://authorized.example/token",
    });
    expect(result.runtime).toMatchObject({ status: "blocked", reason: "target_execution_disabled" });
    if (previous === undefined) delete process.env.ANGELMIND_ENABLE_TARGET_EXECUTION;
    else process.env.ANGELMIND_ENABLE_TARGET_EXECUTION = previous;
  });
});
