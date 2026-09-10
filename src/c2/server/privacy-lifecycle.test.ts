import { describe, expect, it } from "vitest";
import { executePrivacyDelete, executePrivacyExport, executePrivacyRequest } from "./privacy-lifecycle";

describe("privacy lifecycle input validation", () => {
  it("rejects invalid request ids before database work", async () => {
    await expect(executePrivacyExport(0)).rejects.toThrow("request id is invalid");
    await expect(executePrivacyDelete(Number.NaN)).rejects.toThrow("request id is invalid");
    await expect(executePrivacyRequest(1.5)).rejects.toThrow("request id is invalid");
  });
});
