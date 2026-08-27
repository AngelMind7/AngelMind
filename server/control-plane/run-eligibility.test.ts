import { describe, expect, it } from "vitest";
import { getRunEligibility } from "./run-eligibility";

describe("run eligibility", () => {
  it("honors active state, budget, session, and cooldown before any run starts", () => {
    const now = Date.now();
    expect(getRunEligibility({ status: "paused", lastRunAt: null, cooldownMinutes: 0, spentCents: 0, budgetCents: 1, sessionLimitMinutes: 10 }, now).reason).toBe("workspace-not-active");
    expect(getRunEligibility({ status: "active", lastRunAt: null, cooldownMinutes: 0, spentCents: 1, budgetCents: 1, sessionLimitMinutes: 10 }, now).reason).toBe("budget");
    expect(getRunEligibility({ status: "active", lastRunAt: null, cooldownMinutes: 0, spentCents: 0, budgetCents: 1, sessionLimitMinutes: 0 }, now).reason).toBe("session-limit");
    expect(getRunEligibility({ status: "active", lastRunAt: new Date(now - 10_000), cooldownMinutes: 1, spentCents: 0, budgetCents: 1, sessionLimitMinutes: 10 }, now).reason).toBe("cooldown");
  });
});
