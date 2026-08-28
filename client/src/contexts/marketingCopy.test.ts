import { describe, expect, it } from "vitest";
import marketingCopy from "@/locales/marketing-copy.json";
import { locales } from "./LocaleContext";

describe("public marketing locale resource", () => {
  it("supplies non-empty reviewed interface copy for each of the twenty supported locales", () => {
    expect(locales).toHaveLength(20);
    Object.values(marketingCopy).forEach(copy => locales.forEach(({ code }) => expect(copy[code as keyof typeof copy]).toMatch(/\S/)));
  });
  it("keeps the public safety boundary free of residual English fragments outside English", () => {
    const restricted = /no target contact|no autonomous submission|no external delivery|no unverified claims/i;
    Object.values(marketingCopy).forEach(copy => locales.filter(({ code }) => code !== "en").forEach(({ code }) => expect(copy[code as keyof typeof copy]).not.toMatch(restricted)));
  });
});
