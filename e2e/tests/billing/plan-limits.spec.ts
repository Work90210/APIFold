import { test, expect } from "@playwright/test";
import { getTestUser } from "../../fixtures/test-user";
import { ensureAuthenticated } from "../../helpers/auth";

test.describe("Plan Limits Enforcement @billing", () => {
  test.beforeEach(async ({ page }) => {
    const user = getTestUser();
    await ensureAuthenticated(page, user);
  });

  test("settings page shows current plan information", async ({ page }) => {
    await page.goto("/dashboard/settings");

    // Should display plan information (Free tier by default for test users)
    const planSection = page.locator(
      '[data-testid="plan-banner"], [data-testid="billing-section"]',
    ).or(page.getByText(/free|starter|plan/i));
    await expect(planSection.first()).toBeVisible({ timeout: 10_000 });
  });

  test("displays usage meter on settings page", async ({ page }) => {
    await page.goto("/dashboard/settings");

    // Should show usage information
    const usageMeter = page.locator(
      '[data-testid="usage-meter"], [data-testid="usage-dashboard"]',
    ).or(page.getByText(/usage|requests|calls/i));
    await expect(usageMeter.first()).toBeVisible({ timeout: 10_000 });
  });

  test("shows upgrade prompt when on free tier", async ({ page }) => {
    await page.goto("/dashboard/settings");

    // Free tier users should see an upgrade CTA
    const upgradeCta = page.getByRole("button", {
      name: /upgrade|go pro|subscribe/i,
    }).or(page.getByRole("link", { name: /upgrade|go pro|subscribe/i }));
    await expect(upgradeCta.first()).toBeVisible({ timeout: 10_000 });
  });

  test("usage API endpoint returns current usage data", async ({ page }) => {
    const response = await page.request.get("/api/usage");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("success", true);
    expect(body).toHaveProperty("data");
  });

  test("health endpoint is accessible without auth", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("timestamp");
  });
});
