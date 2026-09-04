import { describe, expect, it } from "vitest";
import {
  AGENT_NAMESPACE_POLICIES,
  clientPortalPolicy,
  validateChain,
  validateC2Policy,
  validateCustomScriptPolicy,
  validateDatabaseStrategy,
  validateEgressPolicy,
  validateMobilePolicy,
} from "./v4-gap-closure";

describe("V4 gap closure contracts", () => {
  it("requires explicit allowlisted egress", () => {
    expect(() => validateEgressPolicy({ mode: "proxy", allowedTargets: [], blockedPrivateRanges: true, requireApproval: true })).toThrow();
    expect(() => validateEgressPolicy({ mode: "proxy", allowedTargets: ["example.com"], blockedPrivateRanges: true, requireApproval: true })).not.toThrow();
  });

  it("keeps mobile analysis bounded", () => {
    expect(() => validateMobilePolicy({ tier: "dynamic-queue", queueRequired: true, timeoutMinutes: 30, simulationOnly: true })).not.toThrow();
    expect(() => validateMobilePolicy({ tier: "dynamic-queue", queueRequired: false, timeoutMinutes: 30, simulationOnly: true })).toThrow();
  });

  it("enforces consolidated database strategy", () => {
    expect(() => validateDatabaseStrategy({ phase: "mvp", primary: "postgresql", cache: "redis", objectStorage: "r2", optionalStores: [], outboxSync: true })).not.toThrow();
  });

  it("requires safe custom-script policy", () => {
    expect(() => validateCustomScriptPolicy({ language: "python", maxBytes: 10 * 1024 * 1024, staticAnalysisRequired: true, networkAccess: "allowlisted", privilegedRuntime: false })).not.toThrow();
    expect(() => validateCustomScriptPolicy({ language: "python", maxBytes: 20 * 1024 * 1024, staticAnalysisRequired: true, networkAccess: "disabled", privilegedRuntime: false })).toThrow();
  });

  it("requires simulation-only DAG steps with valid dependencies", () => {
    expect(() => validateChain([{ id: "a", dependsOn: [], simulationOnly: true }, { id: "b", dependsOn: ["a"], simulationOnly: true }])).not.toThrow();
    expect(() => validateChain([{ id: "b", dependsOn: ["missing"], simulationOnly: true }])).toThrow();
  });

  it("keeps C2 governed and fail-closed", () => {
    expect(() => validateC2Policy({ mode: "simulation", targetExecutionEnabled: false, approvalRequired: true, auditRequired: true })).not.toThrow();
    expect(() => validateC2Policy({ mode: "governed", targetExecutionEnabled: true, approvalRequired: true, auditRequired: true })).toThrow();
  });

  it("provides client-safe role separation", () => {
    expect(clientPortalPolicy("executive_viewer").technicalRawData).toBe(false);
    expect(clientPortalPolicy("security_manager").remediationWrite).toBe(true);
    expect(clientPortalPolicy("compliance_officer").complianceWrite).toBe(true);
  });

  it("uses explicit agent namespaces", () => {
    expect(AGENT_NAMESPACE_POLICIES.map(policy => policy.publicName)).toEqual([
      "AI Analyst", "Autonomous Worker", "C2 Implant", "C2 Beacon", "UTF Runner",
    ]);
  });
});
