import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const token = process.env.ANGELMIND_E2E_TOKEN;
const authenticatedRoutes = ["/dashboard", "/research", "/assets", "/tools", "/findings", "/reports", "/security"];

test.describe("authenticated accessibility contract", () => {
  for (const route of authenticatedRoutes) {
    test(`${route} has no serious or critical axe violations`, async ({ page }) => {
      test.skip(!token, "Set ANGELMIND_E2E_TOKEN to run authenticated accessibility against staging.");
      await page.setExtraHTTPHeaders({ Authorization: `Bearer ${token}` });
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const blocking = results.violations.filter(violation => violation.impact === "serious" || violation.impact === "critical");
      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    });
  }
});

