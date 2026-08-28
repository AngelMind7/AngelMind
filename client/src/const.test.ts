import { describe, expect, it } from "vitest";
import { getOAuthConfigStatus } from "./const";

describe("OAuth configuration", () => {
  it("reports missing browser login configuration instead of throwing", () => {
    const status = getOAuthConfigStatus();
    expect(status.configured).toBe(false);
    expect(status.missing).toEqual(expect.arrayContaining(["VITE_OAUTH_PORTAL_URL", "VITE_APP_ID"]));
  });
});
