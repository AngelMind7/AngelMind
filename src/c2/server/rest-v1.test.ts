import { describe, expect, it } from "vitest";
import { parseBearerToken, parsePositiveInteger } from "./rest-v1";

describe("REST v1 input contracts", () => {
  it("accepts positive safe integers", () => {
    expect(parsePositiveInteger("1", "workspaceId")).toBe(1);
    expect(parsePositiveInteger("9007199254740991", "runId")).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("rejects zero, negative, decimal, and unsafe identifiers", () => {
    for (const value of ["0", "-1", "1.5", "1e3", "9007199254740992"]) {
      expect(() => parsePositiveInteger(value, "runId")).toThrow();
    }
  });

  it("parses only bearer authorization headers", () => {
    expect(parseBearerToken("Bearer am_secret")).toBe("am_secret");
    expect(parseBearerToken("bearer  token-2")).toBe("token-2");
    expect(parseBearerToken("Basic token")).toBeNull();
    expect(parseBearerToken(undefined)).toBeNull();
  });
});
