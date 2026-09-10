import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { evaluatePolicy, isTargetInScope, violatesCodeOfConduct } from "./guardrails";
import { buildRehearsal } from "./rehearsal";

describe("deterministic safety guardrails", () => {
  it("never allows a target that is explicitly excluded", () => {
    fc.assert(fc.property(fc.domain(), target => {
      expect(isTargetInScope(target, [target], [target])).toBe(false);
    }));
  });

  it("always blocks Tier 3 actions until a human approval is represented outside the policy engine", () => {
    fc.assert(fc.property(fc.domain(), target => {
      const decision = evaluatePolicy({
        target,
        allowlist: [target],
        exclusions: [],
        safeHarbor: "Authorized safe-harbor declaration.",
        codeOfConduct: "No destructive action and no sensitive-data collection.",
        action: "privileged_proof",
        spentCents: 0,
        budgetCents: 1_000,
        elapsedMinutes: 0,
        sessionLimitMinutes: 60,
        dryRun: false,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.networkAllowed).toBe(false);
      expect(decision.reasons.join(" ")).toContain("Tier 3");
    }));
  });

  it("keeps every rehearsal network-free and tool-free", () => {
    const result = buildRehearsal({
      target: "app.example.test",
      allowlist: ["app.example.test"],
      exclusions: [],
      safeHarbor: "Authorized security research safe harbor.",
      codeOfConduct: "No destructive testing, no data extraction, no social engineering.",
      spentCents: 0,
      budgetCents: 2_000,
      sessionLimitMinutes: 120,
    });
    expect(result.networkCalls).toBe(0);
    expect(result.toolExecutions).toBe(0);
    expect(result.tasks.every(task => task.simulationOnly)).toBe(true);
  });

  it("blocks conduct-prohibited action classes deterministically", () => {
    expect(violatesCodeOfConduct("social_engineering", "No social engineering.")).toBe(true);
    expect(violatesCodeOfConduct("denial_of_service", "No denial-of-service activity.")).toBe(true);
    expect(violatesCodeOfConduct("data_exfiltration", "No sensitive-data extraction.")).toBe(true);
  });
});
