import { describe, expect, it } from "vitest";
import { computeScopeSnapshotHash, parseAuthorizationReference, verifyAuthorizationReference } from "./authorization-reference";

const scope = {
  includedAssets: ["https://app.example.com"],
  excludedAssets: [],
  rules: ["rate-limit"],
  safeHarbor: "Testing is authorized only within the declared program scope.",
};

describe("authorization reference", () => {
  it("rejects reversed authorization windows and malformed hashes", () => {
    expect(parseAuthorizationReference(JSON.stringify({
      documentId: "doc-1",
      validFrom: "2026-01-02T00:00:00.000Z",
      validUntil: "2026-01-01T00:00:00.000Z",
      authorizedBy: "operator-1",
      scopeSnapshotHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    }))).toBeNull();
    expect(parseAuthorizationReference(JSON.stringify({
      documentId: "doc-1",
      validFrom: "2026-01-01T00:00:00.000Z",
      validUntil: "2026-01-02T00:00:00.000Z",
      authorizedBy: "operator-1",
      scopeSnapshotHash: "invalid",
    }))).toBeNull();
  });

  it("normalizes canonical authorization references", () => {
    const result = verifyAuthorizationReference({
      authorizationReference: JSON.stringify({
        documentId: " doc-1 ",
        validFrom: "2026-01-01T00:00:00.000Z",
        validUntil: "2026-01-02T00:00:00.000Z",
        authorizedBy: " operator-1 ",
        scopeSnapshotHash: computeScopeSnapshotHash(scope).toUpperCase(),
      }),
      scope,
      now: new Date("2026-01-01T12:00:00.000Z"),
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.reference.documentId).toBe("doc-1");
      expect(result.reference.authorizedBy).toBe("operator-1");
    }
  });
});
