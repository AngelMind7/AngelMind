import { describe, expect, it } from "vitest";
import { sha256, signArchiveManifest, verifyArchiveIntegrity } from "./archive-integrity";

describe("audit archive integrity", () => {
  it("verifies an archive only when manifest content and signature match", () => {
    const manifest = '{"workspaceId":7,"schema":"angelmind.audit-archive.v1"}';
    const hash = sha256(manifest);
    const signature = signArchiveManifest(hash, "test-key");
    expect(verifyArchiveIntegrity(manifest, hash, signature, "test-key")).toBe(true);
    expect(verifyArchiveIntegrity(`${manifest}x`, hash, signature, "test-key")).toBe(false);
    expect(verifyArchiveIntegrity(manifest, hash, `${signature}x`, "test-key")).toBe(false);
  });
});
