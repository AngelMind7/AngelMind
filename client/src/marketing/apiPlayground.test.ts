import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import apiCopy from "@/locales/api-playground-copy.json";
import { locales } from "@/contexts/LocaleContext";
import { publicRoutes } from "@/publicRoutes";

describe("public API Playground boundary", () => {
  it("is route-isolated, localized, synthetic, and contains no network or credential path", () => {
    const page = readFileSync(path.resolve(import.meta.dirname, "ApiPlayground.tsx"), "utf8");
    expect(publicRoutes.find(route => route.path === "/api-playground")?.boundary).toBe("synthetic-read-only");
    expect(page).toContain("api.badge");
    expect(page).toContain("api.notice.body");
    expect(page).toContain('dir="ltr"');
    expect(page).not.toMatch(/\bfetch\s*\(|axios|XMLHttpRequest|credential|apiKey|token/i);
  });
  it("provides all twenty locales with complete public interface copy", () => {
    Object.values(apiCopy).forEach(copy => locales.forEach(({ code }) => expect(copy[code as keyof typeof copy]).toMatch(/\S/)));
  });
  it("keeps non-English safety copy free of residual English execution-boundary phrases", () => {
    const restricted = /synthetic only|no live execution|no target contact|no external delivery|sends a request/i;
    Object.values(apiCopy).forEach(copy => locales.filter(({ code }) => code !== "en").forEach(({ code }) => expect(copy[code as keyof typeof copy]).not.toMatch(restricted)));
  });
});
