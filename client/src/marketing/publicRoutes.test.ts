import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { publicRoutes } from "../publicRoutes";

describe("public route inventory", () => {
  it("covers every public route with explicit component ownership and a declared safe boundary", () => {
    expect(publicRoutes).toHaveLength(32);
    expect(new Set(publicRoutes.map(route => route.path)).size).toBe(publicRoutes.length);
    publicRoutes.forEach(route => {
      expect(route.path).toMatch(/^\//);
      expect(route.component.name).toMatch(/^(MarketingHome|TrustCenter|PublicInfoPage)$/);
      expect(route.boundary).toBeTruthy();
    });
  });
  it("keeps every MarketingHome route localized and isolated from authenticated workspace access", () => {
    const source = readFileSync(path.resolve(import.meta.dirname, "MarketingHome.tsx"), "utf8");
    ["marketing.product", "marketing.features", "marketing.docs", "marketing.security", "marketing.nav"].forEach(key => expect(source).toContain(key));
    expect(source).not.toMatch(/\btrpc\b|useAuth|DashboardLayout|workspace\.list|api\/trpc/i);
  });
  it("registers the centralized inventory before the dashboard fallback route", () => {
    const app = readFileSync(path.resolve(import.meta.dirname, "../App.tsx"), "utf8");
    expect(app).toContain("publicRoutes.map");
    expect(app).toContain("<Route component={DashboardRouter}");
  });
});
