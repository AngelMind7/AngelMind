import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("safe PWA shell", () => {
  it("uses a static-app manifest while excluding API routes from navigation fallback", () => {
    const config = readFileSync(path.resolve(import.meta.dirname, "../../../vite.config.ts"), "utf8");
    expect(config).toContain("VitePWA");
    expect(config).not.toContain("/storage/");
    expect(config).toContain("/^\\/api\\//");
    expect(config).not.toContain("__runtime__");
  });
  it("presents offline state as static-only rather than permitting protected workflow activity", () => {
    const component = readFileSync(path.resolve(import.meta.dirname, "../components/OfflineStatus.tsx"), "utf8");
    expect(component).toContain("static interface only");
    expect(component).toContain("governance actions require a live connection");
  });
});
