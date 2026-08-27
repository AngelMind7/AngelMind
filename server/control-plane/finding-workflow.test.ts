import { describe, expect, it } from "vitest";
import { assertFindingTransition } from "./finding-workflow";

describe("finding workflow", () => {
  it("does not permit reporting before recorded human review", () => {
    expect(() => assertFindingTransition("validated", "reported", false)).toThrow("human review");
  });

  it("never exposes automated submission", () => {
    expect(() => assertFindingTransition("reported", "submitted", true)).toThrow("never available");
  });
});
