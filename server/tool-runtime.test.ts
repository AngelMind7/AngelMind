import { describe, expect, it } from "vitest";
import { listRegisteredAdapters, runRegisteredTool } from "./tool-runtime";

describe("registered tool runtime", () => {
  it("exposes only explicitly registered safe adapters", () => {
    expect(listRegisteredAdapters()).toEqual([
      {
        toolKey: "binary_artifact_analysis.24",
        binary: "yara",
        allowedModes: ["offline_artifact"],
      },
      {
        toolKey: "binary_artifact_analysis.30",
        binary: "objdump",
        allowedModes: ["offline_artifact"],
      },
    ]);
  });

  it("blocks provisional catalog entries before spawning a process", async () => {
    await expect(
      runRegisteredTool({
        toolKey: "binary_artifact_analysis.30",
        mode: "offline_artifact",
        scopeValidated: true,
        humanApproval: false,
        input: "not an executable",
      })
    ).resolves.toMatchObject({
      status: "blocked",
      reason: "tool_not_verified",
    });
  });

  it("blocks unknown tool keys and unsupported modes", async () => {
    await expect(
      runRegisteredTool({
        toolKey: "missing.1",
        mode: "offline_artifact",
        scopeValidated: true,
        humanApproval: false,
        input: "data",
      })
    ).resolves.toMatchObject({ status: "blocked", reason: "tool_not_found" });

    await expect(
      runRegisteredTool({
        toolKey: "binary_artifact_analysis.30",
        mode: "passive_readonly",
        scopeValidated: true,
        humanApproval: false,
        input: "data",
      })
    ).resolves.toMatchObject({
      status: "blocked",
      reason: "mode_not_supported",
    });
  });
});
