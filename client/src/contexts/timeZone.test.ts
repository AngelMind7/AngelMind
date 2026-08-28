import { describe, expect, it } from "vitest";
import { formatLocaleDate, isValidTimeZone } from "./LocaleContext";

describe("locale time-zone helpers", () => {
  it("accepts valid IANA zones and rejects invalid values", () => {
    expect(isValidTimeZone("Asia/Jakarta")).toBe(true);
    expect(isValidTimeZone("not/a-time-zone")).toBe(false);
  });
  it("formats the same stored UTC instant for the selected IANA zone", () => {
    const instant = "2026-08-28T00:00:00.000Z";
    expect(formatLocaleDate("en", instant, "UTC")).toContain("12:00 AM");
    expect(formatLocaleDate("en", instant, "Asia/Jakarta")).toContain("7:00 AM");
  });
});
