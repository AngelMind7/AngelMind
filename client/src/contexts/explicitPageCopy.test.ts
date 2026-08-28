import { describe, expect, it } from "vitest";
import explicitPageCopy from "@/locales/assurance-notifications-copy.json";
import { locales } from "./LocaleContext";

describe("explicit Assurance and Signal Center locale copy", () => {
  it("provides non-empty controlled interface text for each supported locale", () => {
    Object.values(explicitPageCopy).forEach(translation => locales.forEach(({ code }) => expect(translation[code]).toMatch(/\S/)));
  });
});
