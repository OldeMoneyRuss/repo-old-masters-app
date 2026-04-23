import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility audit using axe-core.
 * Fails on any serious or critical violation across key public pages.
 */

async function runAxe(page: Parameters<typeof AxeBuilder>[0]) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  return results.violations.filter((v) =>
    ["serious", "critical"].includes(v.impact ?? ""),
  );
}

test.describe("Accessibility — public pages", () => {
  test("home page has no serious/critical a11y violations", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  test("catalog page has no serious/critical a11y violations", async ({ page }) => {
    await page.goto("/catalog");
    await page.waitForLoadState("networkidle");
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  test("artwork PDP has no serious/critical a11y violations", async ({ page }) => {
    await page.goto("/catalog");
    const firstLink = page.locator("a[href*='/catalog/']").first();
    await expect(firstLink).toBeVisible();
    await firstLink.click();
    await page.waitForLoadState("networkidle");
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  test("checkout page has no serious/critical a11y violations", async ({ page }) => {
    await page.goto("/checkout");
    await page.waitForLoadState("networkidle");
    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });
});

function formatViolations(
  violations: Awaited<ReturnType<typeof runAxe>>,
): string {
  if (violations.length === 0) return "";
  return violations
    .map((v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} node(s))`)
    .join("\n");
}
