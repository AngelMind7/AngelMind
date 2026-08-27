import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { getAdministrativeCheckEligibility } from "./scheduler";

describe("scheduled administrative check eligibility", () => {
  it("never schedules an inactive workspace", () => {
    fc.assert(fc.property(fc.constantFrom("paused", "archived") as fc.Arbitrary<"paused" | "archived">, status => {
      expect(getAdministrativeCheckEligibility({ status, lastRunAt: null, cooldownMinutes: 0, sessionLimitMinutes: 10, spentCents: 0, budgetCents: 1 }).eligible).toBe(false);
    }));
  });

  it("honors budget and cooldown ceilings", () => {
    const now = Date.now();
    expect(getAdministrativeCheckEligibility({ status: "active", lastRunAt: new Date(now - 59_000), cooldownMinutes: 1, sessionLimitMinutes: 10, spentCents: 0, budgetCents: 10 }, now).reason).toBe("cooldown");
    expect(getAdministrativeCheckEligibility({ status: "active", lastRunAt: null, cooldownMinutes: 0, sessionLimitMinutes: 10, spentCents: 10, budgetCents: 10 }, now).reason).toBe("budget");
    expect(getAdministrativeCheckEligibility({ status: "active", lastRunAt: null, cooldownMinutes: 0, sessionLimitMinutes: 0, spentCents: 0, budgetCents: 10 }, now).reason).toBe("session-limit");
  });
});
