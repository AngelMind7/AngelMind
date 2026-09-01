import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const publicRoutes = ["/product", "/features", "/docs", "/trust", "/security", "/pricing"];

test.describe("public accessibility contract", () => {
  for (const route of publicRoutes) {
    test(`${route} has no serious or critical axe violations`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const blocking = results.violations.filter(violation =>
        violation.impact === "serious" || violation.impact === "critical",
      );

      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    });
  }
});
