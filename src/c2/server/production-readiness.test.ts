import { describe, expect, it } from "vitest";
import { evaluateRequiredProductionCapabilities, parseRequiredProductionCapabilities } from "./production-readiness";

const healthy = {
  databaseConfigured: true,
  databaseReachable: true,
  runtime: { configured: true, ready: true, missing: [] },
  providers: { configured: true, ready: true, probes: [] },
};

describe("production capability readiness", () => {
  it("parses only supported capabilities and removes duplicates", () => {
    expect(parseRequiredProductionCapabilities(" database,providers,unknown,database ")).toEqual(["database", "providers"]);
  });

  it("is permissive when no explicit capability contract is configured", () => {
    expect(evaluateRequiredProductionCapabilities({ ...healthy, providers: { configured: false, ready: true, probes: [] } }, [])).toMatchObject({ configured: false, ready: true, missing: [] });
  });

  it("fails closed for each configured capability", () => {
    expect(evaluateRequiredProductionCapabilities({ ...healthy, databaseReachable: false }, ["database"])).toMatchObject({ ready: false, missing: ["database"] });
    expect(evaluateRequiredProductionCapabilities({ ...healthy, runtime: { configured: true, ready: false, missing: ["nmap"] } }, ["runtime"])).toMatchObject({ ready: false, missing: ["runtime"] });
    expect(evaluateRequiredProductionCapabilities({ ...healthy, providers: { configured: true, ready: false, probes: [] } }, ["providers"])).toMatchObject({ ready: false, missing: ["providers"] });
  });
});
