import { describe, expect, it } from "vitest";
import homeCopy from "@/locales/home-copy.json";
import { locales } from "./LocaleContext";

describe("explicit command-center locale copy", () => {
  it("provides a non-empty translation for each supported locale and key", () => {
    Object.values(homeCopy).forEach(translation => locales.forEach(({ code }) => expect(translation[code]).toMatch(/\S/)));
  });
});
