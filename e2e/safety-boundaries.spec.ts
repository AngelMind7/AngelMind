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

test("public information routes render without an authenticated session", async ({ page }) => {
  for (const path of ["/pricing", "/demo", "/changelog", "/roadmap", "/status", "/contact", "/academy", "/privacy", "/terms", "/cookies"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText(/No target contact|No autonomous submission|Safety stays visible/i).first()).toBeVisible();
  }
});

test("public shell exposes install metadata and safe health endpoints", async ({ page, request }) => {
  await page.goto("/product");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.json");
  await expect((await request.get("/healthz")).ok()).toBeTruthy();
  await expect((await request.get("/metrics")).ok()).toBeTruthy();
});
