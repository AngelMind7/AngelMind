import { describe, expect, it } from "vitest";
import { validateAuthorizedCapabilityPolicy } from "./authorized-capability";

const base = {
  target: "https://app.example.com/login",
  allowlist: ["example.com"],
  exclusions: [],
  safeHarbor: "Testing is authorized only within the declared program scope.",
  operatorId: "operator-1",
  approvedAt: "2026-01-01T00:00:00.000Z",
  expiresAt: "2026-01-02T00:00:00.000Z",
  maxRequestsPerMinute: 30,
  killSwitch: false,
  humanApproval: true,
};

describe("authorized capability policy", () => {
  it("accepts an in-scope, approved, time-bounded policy", () => {
    expect(validateAuthorizedCapabilityPolicy(base, new Date("2026-01-01T12:00:00.000Z")).target).toBe("app.example.com");
  });

  it("rejects out-of-scope and explicitly excluded targets", () => {
    expect(() => validateAuthorizedCapabilityPolicy({ ...base, target: "other.test" })).toThrow("outside the authorized allowlist");
    expect(() => validateAuthorizedCapabilityPolicy({ ...base, exclusions: ["example.com"] })).toThrow("explicitly excluded");
  });

  it("rejects expired, unapproved, unsafe, or unbounded policies", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    expect(() => validateAuthorizedCapabilityPolicy({ ...base, humanApproval: false }, now)).toThrow("Human approval");
    expect(() => validateAuthorizedCapabilityPolicy({ ...base, killSwitch: true }, now)).toThrow("kill switch");
    expect(() => validateAuthorizedCapabilityPolicy({ ...base, maxRequestsPerMinute: 121 }, now)).toThrow("Rate limit");
    expect(() => validateAuthorizedCapabilityPolicy({ ...base, expiresAt: "2025-12-31T00:00:00.000Z" }, now)).toThrow("Authorization window");
  });
});
