import { test, expect } from "@playwright/test";
import { getTestUser, STRIPE_TEST_CARDS, STRIPE_TEST_CARD_DETAILS } from "../../fixtures/test-user";
import { ensureAuthenticated } from "../../helpers/auth";

test.describe("Stripe Checkout Upgrade @billing @stripe", () => {
  test.beforeEach(async ({ page }) => {
    const user = getTestUser();
    await ensureAuthenticated(page, user);
  });

  test("clicking upgrade initiates Stripe checkout", async ({ page }) => {
    await page.goto("/dashboard/settings");

    // Find and click the upgrade button
    const upgradeButton = page.getByRole("button", {
      name: /upgrade|go pro|subscribe/i,
    }).or(page.getByRole("link", { name: /upgrade|go pro|subscribe/i }));
    await expect(upgradeButton.first()).toBeVisible({ timeout: 10_000 });
    await upgradeButton.first().click();

    // Should redirect to Stripe Checkout or open a checkout modal
    // In test mode, Stripe Checkout uses checkout.stripe.com
    // Wait for navigation or modal to appear
    const redirected = await page.waitForURL(
      /checkout\.stripe\.com|\/api\/billing\/checkout/,
      { timeout: 30_000 },
    ).then(() => true).catch(() => false);

    if (!redirected) {
      // If no redirect, verify a modal/plan comparison UI appeared
      await expect(
        page.getByText(/choose.*plan|compare.*plans|select.*plan/i),
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test("Stripe checkout page renders with test mode badge", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings");

    const upgradeButton = page.getByRole("button", {
      name: /upgrade|go pro|subscribe/i,
    }).or(page.getByRole("link", { name: /upgrade|go pro|subscribe/i }));
    await upgradeButton.first().click();

    // Wait to land on Stripe checkout
    test.skip(
      !process.env["STRIPE_SECRET_KEY"],
      "STRIPE_SECRET_KEY not configured",
    );

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });

    // Stripe test mode shows a "TEST MODE" banner
    await expect(
      page.getByText(/test mode/i),
    ).toBeVisible({ timeout: 10_000 });

    // Should display the product/plan name
    await expect(page.locator("body")).toContainText(/pro|premium|plan/i);
  });

  test("can fill in Stripe test card details", async ({ page }) => {
    await page.goto("/dashboard/settings");

    const upgradeButton = page.getByRole("button", {
      name: /upgrade|go pro|subscribe/i,
    }).or(page.getByRole("link", { name: /upgrade|go pro|subscribe/i }));
    await upgradeButton.first().click();

    test.skip(
      !process.env["STRIPE_SECRET_KEY"],
      "STRIPE_SECRET_KEY not configured",
    );

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });

    // Fill in Stripe test card number
    // Stripe uses iframes for card input
    const cardFrame = page.frameLocator(
      'iframe[name*="__stripe"], iframe[title*="card"]',
    ).first();

    const cardInput = cardFrame.locator(
      'input[name="cardnumber"], input[placeholder*="card number"]',
    );
    await cardInput.waitFor({ state: "visible", timeout: 10_000 });
    await cardInput.fill(STRIPE_TEST_CARDS.visa);

    // Fill expiry
    const expiryInput = cardFrame.locator(
      'input[name="exp-date"], input[placeholder*="MM"]',
    );
    await expiryInput.fill(STRIPE_TEST_CARD_DETAILS.expiry);

    // Fill CVC
    const cvcInput = cardFrame.locator(
      'input[name="cvc"], input[placeholder*="CVC"]',
    );
    await cvcInput.fill(STRIPE_TEST_CARD_DETAILS.cvc);
  });

  test("billing portal link is accessible", async ({ page }) => {
    // The billing portal API should respond (even if it redirects to Stripe)
    const response = await page.request.post("/api/billing/portal");

    // Should either redirect (303) or return a URL
    expect([200, 303, 302]).toContain(response.status());
  });
});
