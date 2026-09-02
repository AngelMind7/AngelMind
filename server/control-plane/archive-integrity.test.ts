import { describe, expect, it } from "vitest";
import { assertArchiveManifest, sha256, signArchiveManifest, verifyArchiveIntegrity } from "./archive-integrity";

describe("audit archive integrity", () => {
  it("rejects malformed or cross-workspace manifests", () => {
    expect(assertArchiveManifest('{"schema":"angelmind.audit-archive.v1","workspaceId":7,"evidence":[]}', 7)).toMatchObject({ workspaceId: 7 });
    expect(() => assertArchiveManifest('{"schema":"wrong","workspaceId":7}', 7)).toThrow("schema or workspace");
    expect(() => assertArchiveManifest('{"schema":"angelmind.audit-archive.v1","workspaceId":8}', 7)).toThrow("schema or workspace");
    expect(() => assertArchiveManifest('{"schema":"angelmind.audit-archive.v1","workspaceId":7,"evidence":{}}', 7)).toThrow("must be an array");
    expect(() => assertArchiveManifest("not-json", 7)).toThrow("JSON is invalid");
  });

  it("verifies an archive only when manifest content and signature match", () => {
    const manifest = '{"workspaceId":7,"schema":"angelmind.audit-archive.v1"}';
    const hash = sha256(manifest);
    const signature = signArchiveManifest(hash, "test-key");
    expect(verifyArchiveIntegrity(manifest, hash, signature, "test-key")).toBe(true);
    expect(verifyArchiveIntegrity(`${manifest}x`, hash, signature, "test-key")).toBe(false);
    expect(verifyArchiveIntegrity(manifest, hash, `${signature}x`, "test-key")).toBe(false);
  });
});
