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
      {
        toolKey: "validation.6",
        binary: "foremost",
        allowedModes: ["offline_artifact"],
      },
      {
        toolKey: "validation.13",
        binary: "mmls",
        allowedModes: ["offline_artifact"],
      },
      {
        toolKey: "validation.19",
        binary: "dc3dd",
        allowedModes: ["offline_artifact"],
      },
      {
        toolKey: "validation.12",
        binary: "scalpel",
        allowedModes: ["offline_artifact"],
      },
      {
        toolKey: "validation.8",
        binary: "log2timeline.py",
        allowedModes: ["offline_artifact"],
      },
      {
        toolKey: "secrets_detection.1",
        binary: "gitleaks",
        allowedModes: ["offline_artifact"],
      },
      {
        toolKey: "source_code.1",
        binary: "bandit",
        allowedModes: ["offline_artifact"],
      },
      {
        toolKey: "source_code.19",
        binary: "shellcheck",
        allowedModes: ["offline_artifact"],
      },
      {
        toolKey: "source_code.22",
        binary: "cppcheck",
        allowedModes: ["offline_artifact"],
      },
      {
        toolKey: "source_code.9",
        binary: "flawfinder",
        allowedModes: ["offline_artifact"],
      },
      {
        toolKey: "binary_artifact_analysis.8",
        binary: "gdb",
        allowedModes: ["offline_artifact"],
      },
      {
        toolKey: "binary_artifact_analysis.2",
        binary: "binwalk",
        allowedModes: ["offline_artifact"],
      },
      {
        toolKey: "binary_artifact_analysis.3",
        binary: "python3",
        allowedModes: ["offline_artifact"],
      },
      {
        toolKey: "binary_artifact_analysis.23",
        binary: "python3",
        allowedModes: ["offline_artifact"],
      },
      {
        toolKey: "source_code.23",
        binary: "njsscan",
        allowedModes: ["offline_artifact"],
      },
      {
        toolKey: "secrets_detection.8",
        binary: "detect-secrets",
        allowedModes: ["offline_artifact"],
      },
      {
        toolKey: "dependencies.20",
        binary: "pip-audit",
        allowedModes: ["offline_artifact"],
      },
      {
        toolKey: "source_code.18",
        binary: "semgrep",
        allowedModes: ["offline_artifact"],
      },
      {
        toolKey: "supply_chain.3",
        binary: "cyclonedx-py",
        allowedModes: ["offline_artifact"],
      },
      {
        toolKey: "validation.17",
        binary: "vol",
        allowedModes: ["offline_artifact"],
      },
      {
        toolKey: "log_analysis.13",
        binary: "sigmac",
        allowedModes: ["offline_artifact"],
      },
      {
        toolKey: "traffic_analysis.12",
        binary: "tshark",
        allowedModes: ["passive_readonly"],
      },
      {
        toolKey: "traffic_analysis.17",
        binary: "tcpdump",
        allowedModes: ["passive_readonly"],
      },
    ]);
  });

  it("blocks unregistered provisional catalog entries before spawning a process", async () => {
    await expect(
      runRegisteredTool({
        toolKey: "ai_llm_security.1",
        mode: "offline_artifact",
        scopeValidated: true,
        humanApproval: false,
        input: "not an executable",
      })
    ).resolves.toMatchObject({
      status: "unavailable",
      reason: "adapter_not_registered",
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
