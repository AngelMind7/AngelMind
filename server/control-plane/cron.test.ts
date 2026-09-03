import { describe, expect, it } from "vitest";
import { isCronDueAt, isValidUtcCronExpression, normalizeUtcCronExpression } from "./cron";

describe("UTC cron scheduling", () => {
  it("accepts standard five-field expressions and rejects six-field values", () => {
    expect(isValidUtcCronExpression("0 2 * * *")).toBe(true);
    expect(isValidUtcCronExpression("*/15 * * * *")).toBe(true);
    expect(isValidUtcCronExpression("0 0 2 * * *")).toBe(false);
    expect(isValidUtcCronExpression("   ")).toBe(false);
    expect(isValidUtcCronExpression(null as never)).toBe(false);
    expect(() => normalizeUtcCronExpression("0 0 2 * * *")).toThrow("lima kolom");
  });

  it("matches the configured UTC minute and hour", () => {
    const due = new Date("2026-09-02T02:00:00.000Z");
    expect(isCronDueAt("0 2 * * *", due)).toBe(true);
    expect(isCronDueAt("0 3 * * *", due)).toBe(false);
    expect(isCronDueAt("15 2 * * *", due)).toBe(false);
  });

  it("supports step values and Sunday as both 0 and 7", () => {
    expect(isCronDueAt("*/15 * * * *", new Date("2026-09-02T02:15:00.000Z"))).toBe(true);
    expect(isCronDueAt("0 9 * * 3", new Date("2026-09-02T09:00:00.000Z"))).toBe(true);
    expect(isCronDueAt("0 9 * * 7", new Date("2026-09-06T09:00:00.000Z"))).toBe(true);
  });

  it("uses traditional OR semantics when both calendar day fields are restricted", () => {
    const sunday = new Date("2026-09-06T02:00:00.000Z");
    expect(isCronDueAt("0 2 1 * 0", sunday)).toBe(true);
    expect(isCronDueAt("0 2 1 * 1", sunday)).toBe(false);
  });
});
