import { describe, expect, it } from "vitest";
import { getFirebaseAdmin, isFirebaseAdminConfigured, verifyFirebaseIdToken } from "./firebase";

describe("Firebase Admin configuration", () => {
  it("stays disabled without server credentials", () => {
    expect(isFirebaseAdminConfigured()).toBe(false);
    expect(getFirebaseAdmin()).toBeNull();
  });

  it("returns a controlled configuration error for token verification", async () => {
    await expect(verifyFirebaseIdToken("not-a-real-token")).rejects.toThrow("Firebase Admin is not configured");
  });
});
