import { describe, expect, it } from "vitest";
import { getFirebaseClient, isFirebaseClientConfigured } from "./firebase";

describe("Firebase client configuration", () => {
  it("stays disabled when public Firebase env is incomplete", () => {
    expect(isFirebaseClientConfigured()).toBe(false);
    expect(getFirebaseClient()).toBeNull();
  });
});
