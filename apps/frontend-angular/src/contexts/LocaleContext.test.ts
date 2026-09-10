import { describe, expect, it } from "vitest";
import { getLocaleDirection, isLocaleCode, isSafeStaticPhrase, locales, localizeEmbeddedTimestamp, translate, translateStatic } from "./LocaleContext";

describe("AngelMind locale catalog", () => {
  it("ships the twelve enabled locales and accepts only known persistent codes", () => {
    expect(locales).toHaveLength(20);
    expect(isLocaleCode("id")).toBe(true);
    expect(isLocaleCode("zh-CN")).toBe(true);
    expect(isLocaleCode("hi")).toBe(true);
    expect(isLocaleCode("sv")).toBe(true);
    expect(isLocaleCode("unknown")).toBe(false);
  });
  it("keeps English fallback available and sets Arabic as RTL", () => {
    expect(translate("id", "nav.commandCenter")).toBe("Pusat komando");
    expect(translate("ar", "auth.signOut")).toBe("تسجيل الخروج");
    expect(getLocaleDirection("ar")).toBe("rtl");
    expect(getLocaleDirection("ja")).toBe("ltr");
  });
  it("uses translated static operational copy when available and preserves unknown values", () => {
    expect(translateStatic("id", "Evidence artifact ID")).not.toBe("Evidence artifact ID");
    expect(translateStatic("id", "Select workspace")).toBe("Pilih ruang kerja");
    expect(translateStatic("fr", "ANGELMIND")).toBe("ANGELMIND");
  });
  it("translates curated legacy interface copy for each newly added locale", () => {
    ["hi", "vi", "th", "tr", "pl", "nl", "it", "sv"].forEach(locale => expect(translateStatic(locale as LocaleCode, "Evidence artifact ID")).not.toBe("Evidence artifact ID"));
  });
  it("formats embedded browser-default timestamps in the chosen locale without modifying unrelated copy", () => {
    expect(localizeEmbeddedTimestamp("id", "Requested 8/27/2026, 3:30 PM")).not.toContain("8/27/2026");
    expect(localizeEmbeddedTimestamp("en", "No timestamp here")).toBe("No timestamp here");
  });
  it("honors a selected IANA timezone for the legacy timestamp fallback", () => {
    expect(localizeEmbeddedTimestamp("en", "8/28/2026, 12:00 AM", "Asia/Jakarta")).toContain("7:00 AM");
  });
  it("accepts only interface-like static catalog phrases for browser translation", () => {
    expect(isSafeStaticPhrase("Evidence artifact ID")).toBe(true);
    expect(isSafeStaticPhrase("= MIN_WIDTH && newWidth")).toBe(false);
    expect(isSafeStaticPhrase("const pending = true;")).toBe(false);
    expect(isSafeStaticPhrase("@peduarte starred 3 repositories")).toBe(false);
  });
});
