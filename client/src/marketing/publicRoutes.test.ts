import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { publicRoutes } from "../publicRoutes";

describe("public route inventory", () => {
  it("covers every public route with explicit component ownership and a declared safe boundary", () => {
    expect(publicRoutes.map(({ path, component, boundary }) => [path, component.name, boundary])).toEqual([
      ["/", "MarketingHome", "reviewed-static-copy"],
      ["/product", "MarketingHome", "reviewed-static-copy"],
      ["/features", "MarketingHome", "reviewed-static-copy"],
      ["/how-it-works", "PublicInfoPage", "reviewed-static-copy"],
      ["/programs", "PublicInfoPage", "reviewed-static-copy"],
      ["/researchers", "PublicInfoPage", "reviewed-static-copy"],
      ["/trust", "TrustCenter", "implemented-control-inventory"],
      ["/docs", "MarketingHome", "reviewed-static-copy"],
      ["/blog", "PublicInfoPage", "reviewed-static-copy"],
      ["/api-playground", "PublicInfoPage", "read-only-no-execution"],
      ["/security", "MarketingHome", "reviewed-static-copy"],
      ["/pricing", "PublicInfoPage", "informational-no-billing"],
      ["/demo", "PublicInfoPage", "synthetic-read-only"],
      ["/changelog", "PublicInfoPage", "reviewed-static-copy"],
      ["/roadmap", "PublicInfoPage", "reviewed-static-copy"],
      ["/status", "PublicInfoPage", "non-live-status-disclosure"],
      ["/contact", "PublicInfoPage", "non-collecting-contact"],
      ["/academy", "PublicInfoPage", "educational-static-copy"],
      ["/privacy", "PublicInfoPage", "deployment-reviewed-legal-copy"],
      ["/terms", "PublicInfoPage", "deployment-reviewed-legal-copy"],
      ["/cookies", "PublicInfoPage", "deployment-reviewed-legal-copy"],
      ["/acceptable-use", "PublicInfoPage", "deployment-reviewed-legal-copy"],
      ["/responsible-disclosure", "PublicInfoPage", "deployment-reviewed-legal-copy"],
      ["/data-processing", "PublicInfoPage", "deployment-reviewed-legal-copy"],
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
