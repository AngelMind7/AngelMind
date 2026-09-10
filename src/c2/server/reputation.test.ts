import { describe, expect, it } from "vitest";
import { pointsForEvent, reputationLevel } from "./reputation";

describe("reputation scoring", () => {
  it("uses a stable points rubric", () => {
    expect(pointsForEvent("finding_validated")).toBe(20);
    expect(pointsForEvent("review_completed")).toBe(8);
    expect(pointsForEvent("research_completed")).toBe(15);
  });

  it("maps cumulative points to deterministic levels", () => {
    expect(reputationLevel(0)).toBe("contributor");
    expect(reputationLevel(200)).toBe("practitioner");
    expect(reputationLevel(500)).toBe("advanced");
    expect(reputationLevel(1_000)).toBe("expert");
  });
});
