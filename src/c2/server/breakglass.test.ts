import { describe, expect, it } from "vitest";
import { hasActiveBreakGlassAccess, requestBreakGlass } from "./breakglass";

describe("break-glass access contract", () => {
  it("requires a global administrator before touching the database", async () => {
    await expect(requestBreakGlass({ id: 10, role: "user" }, { workspaceId: 1, reason: "Emergency investigation with documented owner approval", durationMinutes: 30 })).rejects.toThrow("requires an administrator");
  });

  it("rejects short or unbounded requests before database access", async () => {
    await expect(requestBreakGlass({ id: 10, role: "admin" }, { workspaceId: 1, reason: "too short", durationMinutes: 30 })).rejects.toThrow("20-2000");
    await expect(requestBreakGlass({ id: 10, role: "admin" }, { workspaceId: 1, reason: "Emergency investigation with documented owner approval", durationMinutes: 1 })).rejects.toThrow("between 5 and 1440");
    await expect(requestBreakGlass({ id: 10, role: "admin" }, { workspaceId: 1, reason: "Emergency investigation with documented owner approval", durationMinutes: 1441 })).rejects.toThrow("between 5 and 1440");
  });

  it("fails closed for invalid access checks", async () => {
    await expect(hasActiveBreakGlassAccess(10, 0)).rejects.toThrow("positive integer");
    await expect(hasActiveBreakGlassAccess(0, 1)).resolves.toBe(false);
  });
});
