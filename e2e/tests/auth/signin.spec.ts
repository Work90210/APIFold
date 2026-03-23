import { test, expect } from "@playwright/test";
import { getTestUser } from "../../fixtures/test-user";
import { signIn, signOut } from "../../helpers/auth";

test.describe("User Sign In @auth", () => {
  test("signs in with valid credentials and reaches dashboard", async ({
    page,
  }) => {
    const user = getTestUser();
    await signIn(page, user);

    // Should be on the dashboard after sign-in
    expect(page.url()).toContain("/dashboard");
    await expect(page.locator('[data-testid="dashboard-content"], main')).toBeVisible();
  });

  test("shows error for invalid password", async ({ page }) => {
    await page.goto("/sign-in");

    const emailInput = page.locator(
      'input[name="identifier"], input[type="email"]',
    );
    await emailInput.waitFor({ state: "visible", timeout: 15_000 });
    await emailInput.fill(getTestUser().email);

    const continueButton = page.getByRole("button", { name: /continue/i });
    await continueButton.click();

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.waitFor({ state: "visible", timeout: 10_000 });
    await passwordInput.fill("WrongPassword123!");

    const signInButton = page.getByRole("button", {
      name: /sign in|log in/i,
    });
    await signInButton.click();

    // Clerk shows an error message for invalid credentials
    const errorMessage = page.locator(
      '.cl-formFieldError, .cl-alert, [data-testid="error-message"]',
    );
    await expect(errorMessage).toBeVisible({ timeout: 10_000 });
  });

  test("redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/dashboard");

    // Should redirect to sign-in
    await page.waitForURL(/sign-in/, { timeout: 15_000 });
    expect(page.url()).toContain("sign-in");
  });

  test("can sign out after signing in", async ({ page }) => {
    const user = getTestUser();
    await signIn(page, user);
    await signOut(page);

    // Should no longer be on the dashboard
    expect(page.url()).not.toContain("/dashboard");
  });
});
