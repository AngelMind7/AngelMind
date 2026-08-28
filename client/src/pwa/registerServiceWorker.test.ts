import { describe, expect, it } from "vitest";
import { CACHE_NAME, SHELL_ASSETS } from "./registerServiceWorker";

describe("PWA shell contract", () => {
  it("uses a stable same-origin cache and safe public shell assets", () => {
    expect(CACHE_NAME).toBe("angelmind-shell-v1");
    expect(SHELL_ASSETS).toContain("/manifest.json");
    expect(SHELL_ASSETS.every(asset => asset.startsWith("/"))).toBe(true);
    expect(SHELL_ASSETS.some(asset => asset.startsWith("/api/"))).toBe(false);
  });
});
