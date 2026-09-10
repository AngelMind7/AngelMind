import { describe, expect, it } from "vitest";
import { planIntegrationSync, validateIntegrationScopes } from "./integration-contract";

describe("self-contained integration contract", () => {
  it("validates provider scopes without contacting a provider", () => {
    expect(validateIntegrationScopes("github", ["repo:read", "issues:read"]).valid).toBe(true);
    expect(validateIntegrationScopes("github", ["admin:write"]).valid).toBe(false);
  });

  it("plans connected fixture events with deterministic evidence", () => {
    const input = { provider: "github" as const, status: "connected" as const, scopes: ["repo:read"], fixture: JSON.stringify([{ externalId: "GH-1", kind: "finding", title: "Synthetic finding", payload: { severity: "high" } }]) };
    const first = planIntegrationSync(input);
    const second = planIntegrationSync(input);
    expect(first).toMatchObject({ eventCount: 1, targetTraffic: false, dispatch: "preview_only" });
    expect(first.accepted).toHaveLength(1);
    expect(first.evidenceHash).toBe(second.evidenceHash);
  });

  it("fails closed for malformed fixtures and does not dispatch drafts", () => {
    expect(() => planIntegrationSync({ provider: "slack", status: "connected", scopes: ["messages:read"], fixture: "not-json" })).toThrow(/valid JSON/);
    const preview = planIntegrationSync({ provider: "slack", status: "draft", scopes: ["messages:read"], fixture: JSON.stringify([{ externalId: "1", kind: "notification", title: "Synthetic", payload: {} }]) });
    expect(preview.accepted).toHaveLength(0);
    expect(preview.rejected[0]?.reason).toBe("connection_draft");
  });
});
