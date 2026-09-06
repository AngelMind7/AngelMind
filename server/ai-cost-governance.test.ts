import { describe, expect, it } from "vitest";
import { calculateAiRunCostCents } from "./ai-platform";

describe("AI cost governance", () => {
  it("calculates input and output token cost in cents", () => {
    expect(calculateAiRunCostCents(1_000_000, 500_000, { inputCostPerMillionCents: 20, outputCostPerMillionCents: 40 })).toBe(40);
  });

  it("rounds fractional cents upward and clamps invalid values", () => {
    expect(calculateAiRunCostCents(1, 1, { inputCostPerMillionCents: 1, outputCostPerMillionCents: 1 })).toBe(1);
    expect(calculateAiRunCostCents(-5, Number.NaN, { inputCostPerMillionCents: -1, outputCostPerMillionCents: 10 })).toBe(0);
  });
});
