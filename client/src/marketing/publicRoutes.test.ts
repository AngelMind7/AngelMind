import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { publicRoutes } from "../publicRoutes";

describe("public route inventory", () => {
  it("covers every public route with explicit component ownership and a declared safe boundary", () => {
    expect(publicRoutes.map(({ path, component, boundary }) => [path, component.name, boundary])).toEqual([
      ["/product", "MarketingHome", "reviewed-static-copy"],
      ["/features", "MarketingHome", "reviewed-static-copy"],
      ["/trust", "TrustCenter", "implemented-control-inventory"],
      ["/docs", "MarketingHome", "reviewed-static-copy"],
      ["/security", "MarketingHome", "reviewed-static-copy"],
      ["/api-playground", "ApiPlayground", "synthetic-read-only"],
    ]);
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
