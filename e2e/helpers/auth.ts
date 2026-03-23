import type { Page } from "@playwright/test";
import type { TestUser } from "../fixtures/test-user";

/**
 * Sign in to the app via Clerk's hosted sign-in UI.
 *
 * This helper navigates to the sign-in page, fills in email + password,
 * and waits for the dashboard to load — confirming a successful login.
 */
export async function signIn(page: Page, user: TestUser): Promise<void> {
  await page.goto("/sign-in");

  // Clerk renders its own form — wait for the email field to appear
  const emailInput = page.locator(
    'input[name="identifier"], input[type="email"]',
  );
  await emailInput.waitFor({ state: "visible", timeout: 15_000 });
  await emailInput.fill(user.email);

  // Click "Continue" to proceed to password step
  const continueButton = page.getByRole("button", { name: /continue/i });
  await continueButton.click();

  // Fill in the password
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.waitFor({ state: "visible", timeout: 10_000 });
  await passwordInput.fill(user.password);

  // Submit the sign-in form
  const signInButton = page.getByRole("button", { name: /sign in|log in/i });
  await signInButton.click();

  // Wait for successful redirect to dashboard
  await page.waitForURL("**/dashboard**", { timeout: 30_000 });
}

/**
 * Sign out of the app via the user menu.
 */
export async function signOut(page: Page): Promise<void> {
  // Open user menu (Clerk's UserButton renders a button with the user's avatar)
  const userButton = page.locator(
    '[data-testid="user-menu"], .cl-userButtonTrigger',
  );
  await userButton.click();

  const signOutButton = page.getByRole("menuitem", { name: /sign out/i });
  await signOutButton.click();

  // Wait to be redirected away from dashboard
  await page.waitForURL(/\/sign-in(?:[/?#].*)?$|\/$/, { timeout: 15_000 });
}

/**
 * Ensure the page is in an authenticated state.
 * If already signed in, this is a no-op. Otherwise signs in.
 */
export async function ensureAuthenticated(
  page: Page,
  user: TestUser,
): Promise<void> {
  await page.goto("/dashboard");

  // If we land on the sign-in page, we need to authenticate
  const url = page.url();
  if (url.includes("sign-in") || !url.includes("dashboard")) {
    await signIn(page, user);
  }
}
