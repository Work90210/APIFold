import { test, expect } from "@playwright/test";
import { generateSignupEmail } from "../../fixtures/test-user";

test.describe("User Registration @auth", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sign-up");
  });

  test("renders the sign-up form with email and password fields", async ({
    page,
  }) => {
    const emailInput = page.locator(
      'input[name="emailAddress"], input[type="email"]',
    );
    await expect(emailInput).toBeVisible({ timeout: 15_000 });

    // The sign-up page should have a heading or title
    await expect(
      page.getByRole("heading", { name: /sign up|create account|get started/i }),
    ).toBeVisible();
  });

  test("shows validation error for invalid email format", async ({ page }) => {
    const emailInput = page.locator(
      'input[name="emailAddress"], input[type="email"]',
    );
    await emailInput.waitFor({ state: "visible", timeout: 15_000 });
    await emailInput.fill("not-an-email");

    const continueButton = page.getByRole("button", { name: /continue/i });
    await continueButton.click();

    // Clerk should show an error for invalid email
    const errorMessage = page.locator(
      '.cl-formFieldError, [data-testid="error-message"]',
    );
    await expect(errorMessage).toBeVisible({ timeout: 5_000 });
  });

  test("shows validation error for weak password", async ({ page }) => {
    const email = generateSignupEmail();

    const emailInput = page.locator(
      'input[name="emailAddress"], input[type="email"]',
    );
    await emailInput.waitFor({ state: "visible", timeout: 15_000 });
    await emailInput.fill(email);

    const continueButton = page.getByRole("button", { name: /continue/i });
    await continueButton.click();

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.waitFor({ state: "visible", timeout: 10_000 });
    await passwordInput.fill("123"); // Too short

    const signUpButton = page.getByRole("button", {
      name: /sign up|create account|continue/i,
    });
    await signUpButton.click();

    // Expect password validation error
    const errorMessage = page.locator(
      '.cl-formFieldError, [data-testid="error-message"]',
    );
    await expect(errorMessage).toBeVisible({ timeout: 5_000 });
  });

  test("navigates to sign-in from sign-up page", async ({ page }) => {
    const signInLink = page.getByRole("link", { name: /sign in|log in/i });
    await expect(signInLink).toBeVisible({ timeout: 15_000 });
    await signInLink.click();

    await page.waitForURL("**/sign-in**", { timeout: 10_000 });
    expect(page.url()).toContain("sign-in");
  });
});
