import { describe, expect, it } from "vitest";
import { resolveCapability, runCapability } from "./capability-runtime";

describe("capability runtime", () => {
  it("resolves a capability through the canonical registry", () => {
    const resolution = resolveCapability("secret-detection");
    expect(resolution).toMatchObject({
      capability: "secret-detection",
      adapter: "gitleaks_adapter",
      toolId: "gitleaks",
      runtimeToolKey: "secrets_detection.1",
      fallbackUsed: false,
    });
  });

  it("rejects unknown capabilities before execution", async () => {
    expect(resolveCapability("not-a-capability")).toBeUndefined();
    await expect(
      runCapability("not-a-capability", {
        mode: "offline_artifact",
        scopeValidated: true,
        humanApproval: true,
        input: "artifact",
      })
    ).resolves.toMatchObject({
      status: "blocked",
      reason: "capability_not_ready",
    });
  });

  it("does not let capability selection bypass authorization", async () => {
    await expect(
      runCapability("secret-detection", {
        mode: "offline_artifact",
        scopeValidated: false,
        humanApproval: false,
        input: "artifact",
      })
    ).resolves.toMatchObject({ status: "blocked" });
  });
});
