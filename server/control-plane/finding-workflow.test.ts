import { describe, expect, it } from "vitest";
import { assertFindingTransition, isFindingTerminal } from "./finding-workflow";

describe("finding workflow", () => {
  it("does not permit reporting before recorded human review", () => {
    expect(() => assertFindingTransition("validated", "reported", false)).toThrow("human review");
  });

  it("never exposes automated submission", () => {
    expect(() => assertFindingTransition("reported", "submitted", true)).toThrow("never available");
  });

  it("models notification, remediation, retest, and resolution checkpoints", () => {
    expect(() => assertFindingTransition("reported", "notified", false)).not.toThrow();
    expect(() => assertFindingTransition("notified", "remediation", false)).not.toThrow();
    expect(() => assertFindingTransition("remediation", "retest", false)).not.toThrow();
    expect(() => assertFindingTransition("retest", "resolved", false)).not.toThrow();
    expect(() => assertFindingTransition("resolved", "reopened", false)).not.toThrow();
  });

  it("allows a failed retest to return to remediation but not jump from reporting to resolved", () => {
    expect(() => assertFindingTransition("retest", "remediation", false)).not.toThrow();
    expect(() => assertFindingTransition("reported", "resolved", false)).toThrow("Invalid finding transition");
  });

  it("identifies terminal states explicitly", () => {
    expect(isFindingTerminal("resolved")).toBe(true);
    expect(isFindingTerminal("false_positive")).toBe(true);
    expect(isFindingTerminal("remediation")).toBe(false);
  });
});
