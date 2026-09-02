import { describe, expect, it } from "vitest";
import { isControlPlaneMutationActive, withControlPlaneReentrancyGuard } from "./reentrancy-guard";

describe("control-plane reentrancy guard", () => {
  it("rejects concurrent mutation and releases the key after completion", async () => {
    let release!: () => void;
    const blocker = new Promise<void>(resolve => { release = resolve; });
    const running = withControlPlaneReentrancyGuard("incident:7", async () => { expect(isControlPlaneMutationActive("incident:7")).toBe(true); await blocker; return "done"; });
    await expect(withControlPlaneReentrancyGuard("incident:7", async () => "duplicate")).rejects.toThrow("reentrancy guard");
    release();
    await expect(running).resolves.toBe("done");
    expect(isControlPlaneMutationActive("incident:7")).toBe(false);
  });

  it("rejects malformed keys without leaking state", async () => {
    await expect(withControlPlaneReentrancyGuard(null as never, async () => "nope")).rejects.toThrow("key is required");
    expect(isControlPlaneMutationActive(null as never)).toBe(false);
  });

  it("releases the key after a failed operation", async () => {
    await expect(withControlPlaneReentrancyGuard("policy:3", async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    await expect(withControlPlaneReentrancyGuard("policy:3", async () => "retry")).resolves.toBe("retry");
  });
});
