import { describe, expect, it } from "vitest";
import { verifyAuditChain } from "./audit-chain";

describe("audit chain input validation", () => {
  it("rejects invalid workspace identifiers before database access", async () => {
    await expect(verifyAuditChain(0)).rejects.toThrow("positive integer");
    await expect(verifyAuditChain(Number.NaN)).rejects.toThrow("positive integer");
    await expect(verifyAuditChain(1.5)).rejects.toThrow("positive integer");
  });
});
