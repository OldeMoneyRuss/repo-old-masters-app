import { test, expect } from "@playwright/test";

/**
 * Guest purchase journey: home → catalog → PDP → cart → checkout → confirmation.
 * Uses Stripe test card 4242 4242 4242 4242.
 * Requires a running app (next dev / next start) with Stripe test keys and a seeded DB.
 */

test.describe("Guest purchase journey", () => {
  test("browse to PDP and add item to cart", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Old Masters/i);

    // Navigate to catalog
    await page.getByRole("link", { name: /catalog|shop|browse/i }).first().click();
    await page.waitForURL(/\/catalog/);

    // Click first artwork card
    const firstCard = page.locator("a[href*='/catalog/']").first();
    await expect(firstCard).toBeVisible();
    const href = await firstCard.getAttribute("href");
    await firstCard.click();
    await page.waitForURL(href!);

    // Verify PDP loaded
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Select a print size if options exist
    const sizeOptions = page.getByRole("radio").filter({ hasText: /\d+x\d+/i });
    if (await sizeOptions.count() > 0) {
      await sizeOptions.first().click();
    }

    // Add to cart
    await page.getByRole("button", { name: /add to cart/i }).click();

    // Cart drawer / count should update
    await expect(page.getByTestId("cart-count")).toHaveText(/[1-9]/);
  });

  test("guest checkout with Stripe test card", async ({ page }) => {
    // Seed cart via adding an item first
    await page.goto("/catalog");
    const firstCard = page.locator("a[href*='/catalog/']").first();
    await firstCard.click();
    await page.waitForURL(/\/catalog\/.+/);
    await page.getByRole("button", { name: /add to cart/i }).click();

    // Go to checkout
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: /checkout/i })).toBeVisible();

    // Fill guest email
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill("test@example.com");

    // Stripe Elements frame — wait for it to load
    const stripeFrame = page.frameLocator("iframe[name*='stripe']").first();
    await stripeFrame.locator("[name='cardnumber']").fill("4242424242424242");
    await stripeFrame.locator("[name='exp-date']").fill("12/30");
    await stripeFrame.locator("[name='cvc']").fill("123");
    await stripeFrame.locator("[name='postal']").fill("10001");

    // Submit
    await page.getByRole("button", { name: /pay|place order/i }).click();

    // Confirm redirect to confirmation page
    await page.waitForURL(/\/checkout\/confirmation\//,  { timeout: 30_000 });
    await expect(page.getByText(/thank you|order confirmed/i)).toBeVisible();
    await expect(page.getByText(/WH-/)).toBeVisible(); // order number
  });
});
