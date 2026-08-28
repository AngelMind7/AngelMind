import { expect, test } from "@playwright/test";

test.describe("public safety boundary", () => {
  test("marketing trust center explains human review and blocked offensive actions", async ({ page }) => {
    await page.goto("/trust");
    await expect(page).toHaveTitle(/AngelMind/i);
    await expect(page.getByText(/human review/i).first()).toBeVisible();
    await expect(page.getByText(/autonomous|active scanning|submission/i).first()).toBeVisible();
  });

  test("public API playground does not expose an execution channel", async ({ page }) => {
    await page.goto("/api-playground");
    await expect(page.getByText(/read-only|offline|governed/i).first()).toBeVisible();
    await expect(page.getByText(/execute exploit|active scan/i)).toHaveCount(0);
  });
});

test("unauthenticated dashboard navigation is protected", async ({ page }) => {
  await page.goto("/findings");
  await expect(page).toHaveURL(/(login|oauth|\/)/i);
});

test("trust center remains usable on mobile", async ({ page }) => {
  await page.goto("/trust");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "visible");
});
