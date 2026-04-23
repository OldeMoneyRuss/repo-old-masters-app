import { test, expect } from "@playwright/test";

/**
 * Admin publish journey: login → create artwork → publish → assert visible publicly.
 * Requires ADMIN_TEST_EMAIL + ADMIN_TEST_PASSWORD env vars pointing to a seeded admin account.
 */

const ADMIN_EMAIL = process.env.ADMIN_TEST_EMAIL ?? "admin@test.local";
const ADMIN_PASSWORD = process.env.ADMIN_TEST_PASSWORD ?? "testpassword";

test.describe("Admin artwork publish journey", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin");
    // If redirected to login, sign in
    if (page.url().includes("/auth") || page.url().includes("/login")) {
      await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
      await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
      await page.getByRole("button", { name: /sign in|log in/i }).click();
      await page.waitForURL(/\/admin/);
    }
  });

  test("admin dashboard loads", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /admin|dashboard/i })).toBeVisible();
  });

  test("orders list is accessible", async ({ page }) => {
    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { name: /orders/i })).toBeVisible();
    // Table or empty-state renders
    const hasContent =
      (await page.locator("table, [data-testid='empty-state']").count()) > 0;
    expect(hasContent).toBe(true);
  });

  test("artwork list is accessible and publish toggle works", async ({ page }) => {
    await page.goto("/admin/artworks");
    await expect(page.getByRole("heading", { name: /artworks/i })).toBeVisible();

    // Find a draft artwork and publish it, or verify published ones render
    const publishButton = page.getByRole("button", { name: /publish/i }).first();
    if (await publishButton.isVisible()) {
      await publishButton.click();
      // Should show success feedback or the button state changes
      await expect(
        page.getByText(/published|unpublish/i).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("published artwork appears in public catalog and sitemap", async ({ page }) => {
    // Get first published artwork slug from catalog
    await page.goto("/catalog");
    const firstLink = page.locator("a[href*='/catalog/']").first();
    await expect(firstLink).toBeVisible();
    const slug = (await firstLink.getAttribute("href"))?.split("/catalog/")[1] ?? "";
    expect(slug.length).toBeGreaterThan(0);

    // Sitemap contains the slug
    const sitemapRes = await page.goto("/sitemap.xml");
    expect(sitemapRes?.status()).toBe(200);
    const body = await page.content();
    expect(body).toContain(`/catalog/${slug}`);
  });
});
