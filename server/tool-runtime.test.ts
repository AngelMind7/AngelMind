import { describe, expect, it } from "vitest";
import { checkRuntimeReadiness, listRegisteredAdapters, runRegisteredTool, runtimePackAllows, runtimePackForMode } from "./tool-runtime";

describe("registered tool runtime", () => {
  it("exposes only explicitly registered catalog adapters", () => {
    expect(listRegisteredAdapters()).toEqual([
      { toolKey: "burp_suite_pro", binary: "burp-rest-cli", allowedModes: ["passive_readonly","active_nondestructive"], requiresTarget: true },
      { toolKey: "jwt_tool", binary: "jwt_tool.py", allowedModes: ["active_nondestructive"], requiresTarget: true },
      { toolKey: "dalfox", binary: "dalfox", allowedModes: ["active_nondestructive"], requiresTarget: true },
      { toolKey: "ssrfmap", binary: "ssrfmap", allowedModes: ["active_nondestructive"], requiresTarget: true },
      { toolKey: "interactsh", binary: "interactsh-client", allowedModes: ["passive_readonly"] },
      { toolKey: "ffuf", binary: "ffuf", allowedModes: ["active_nondestructive"], requiresTarget: true },
      { toolKey: "cloudfox", binary: "cloudfox", allowedModes: ["passive_readonly"] },
      { toolKey: "graphql_cop", binary: "graphql-cop", allowedModes: ["passive_readonly","active_nondestructive"], requiresTarget: true },
      { toolKey: "sqlmap", binary: "sqlmap", allowedModes: ["privileged_or_destructive"], requiresTarget: true },
      { toolKey: "nuclei", binary: "nuclei", allowedModes: ["passive_readonly","active_nondestructive"], requiresTarget: true },
      { toolKey: "httpx", binary: "httpx", allowedModes: ["passive_readonly"], requiresTarget: true },
      { toolKey: "naabu", binary: "naabu", allowedModes: ["passive_readonly"], requiresTarget: true },
      { toolKey: "katana", binary: "katana", allowedModes: ["passive_readonly"], requiresTarget: true },
      { toolKey: "custom_scripts", binary: "python3", allowedModes: ["offline_artifact","passive_readonly"] },
      { toolKey: "secrets_detection.1", binary: "gitleaks", allowedModes: ["offline_artifact"] },
      { toolKey: "asset_intelligence.28", binary: "subfinder", allowedModes: ["passive_readonly"], requiresTarget: true },
      { toolKey: "dependencies.12", binary: "trivy", allowedModes: ["offline_artifact"] },
    ]);
  });

  it("assigns modes to explicit runtime packs", () => {
    expect(runtimePackForMode("offline_artifact")).toBe("artifact-pack");
    expect(runtimePackForMode("passive_readonly")).toBe("passive-pack");
    const previous = process.env.RUNTIME_PACK_ID;
    process.env.RUNTIME_PACK_ID = "artifact-pack";
    expect(runtimePackAllows("offline_artifact")).toBe(true);
    expect(runtimePackAllows("passive_readonly")).toBe(false);
    if (previous === undefined) delete process.env.RUNTIME_PACK_ID;
    else process.env.RUNTIME_PACK_ID = previous;
  });

  it("reports readiness when no required binary list is configured", async () => {
    const previous = process.env.RUNTIME_REQUIRED_BINARIES;
    delete process.env.RUNTIME_REQUIRED_BINARIES;
    await expect(checkRuntimeReadiness()).resolves.toEqual({ configured: false, ready: true, missing: [] });
    if (previous === undefined) delete process.env.RUNTIME_REQUIRED_BINARIES;
    else process.env.RUNTIME_REQUIRED_BINARIES = previous;
  });

  it("fails readiness for missing or unregistered required binaries", async () => {
    const previous = process.env.RUNTIME_REQUIRED_BINARIES;
    process.env.RUNTIME_REQUIRED_BINARIES = "python3,missing-runtime-binary";
    await expect(checkRuntimeReadiness()).resolves.toEqual({ configured: true, ready: false, missing: ["missing-runtime-binary"] });
    if (previous === undefined) delete process.env.RUNTIME_REQUIRED_BINARIES;
    else process.env.RUNTIME_REQUIRED_BINARIES = previous;
  });

  it("blocks execution when the configured pack does not match the mode", async () => {
    const previous = process.env.RUNTIME_PACK_ID;
    process.env.RUNTIME_PACK_ID = "passive-pack";
    await expect(runRegisteredTool({ toolKey: "custom_scripts", mode: "offline_artifact", scopeValidated: true, humanApproval: false, input: "data" })).resolves.toMatchObject({ status: "blocked", reason: "runtime_pack_mismatch" });
    if (previous === undefined) delete process.env.RUNTIME_PACK_ID;
    else process.env.RUNTIME_PACK_ID = previous;
  });

  it("blocks empty input before spawning a process", async () => {
    await expect(runRegisteredTool({ toolKey: "httpx", mode: "passive_readonly", scopeValidated: true, humanApproval: false, input: "" })).resolves.toMatchObject({ status: "blocked", reason: "input_limit_exceeded" });
  });

  it("blocks invalid direct resource limits before spawning a process", async () => {
    await expect(runRegisteredTool({ toolKey: "httpx", mode: "passive_readonly", scopeValidated: true, humanApproval: false, input: "data", timeoutMs: Number.NaN })).resolves.toMatchObject({ status: "blocked", reason: "invalid_timeout" });
    await expect(runRegisteredTool({ toolKey: "httpx", mode: "passive_readonly", scopeValidated: true, humanApproval: false, input: "data", maxOutputBytes: Number.POSITIVE_INFINITY })).resolves.toMatchObject({ status: "blocked", reason: "invalid_output_limit" });
  });

  it("blocks removed legacy catalog entries before spawning a process", async () => {
    await expect(runRegisteredTool({ toolKey: "ai_llm_security.1", mode: "offline_artifact", scopeValidated: true, humanApproval: false, input: "not an executable" })).resolves.toMatchObject({ status: "blocked", reason: "tool_not_found" });
  });

  it("blocks unknown tool keys and unsupported modes", async () => {
    await expect(runRegisteredTool({ toolKey: "missing.1", mode: "offline_artifact", scopeValidated: true, humanApproval: false, input: "data" })).resolves.toMatchObject({ status: "blocked", reason: "tool_not_found" });
    await expect(runRegisteredTool({ toolKey: "httpx", mode: "offline_artifact", scopeValidated: true, humanApproval: false, input: "data" })).resolves.toMatchObject({ status: "blocked", reason: "mode_not_supported" });
  });

  it("fails closed when scope is not validated or input exceeds the cap", async () => {
    await expect(runRegisteredTool({ toolKey: "httpx", mode: "passive_readonly", scopeValidated: false, humanApproval: false, input: "https://example.com" })).resolves.toMatchObject({ status: "blocked", reason: "scope_not_validated" });
    await expect(runRegisteredTool({ toolKey: "custom_scripts", mode: "offline_artifact", scopeValidated: true, humanApproval: false, input: "x".repeat(2_000_001) })).resolves.toMatchObject({ status: "blocked", reason: "input_limit_exceeded" });
  });
});