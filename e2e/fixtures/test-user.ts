/**
 * Test user credentials loaded from environment variables.
 * These should point to a dedicated Clerk test account.
 */
export interface TestUser {
  readonly email: string;
  readonly password: string;
}

export function getTestUser(): TestUser {
  const email = process.env["CLERK_TEST_EMAIL"];
  const password = process.env["CLERK_TEST_PASSWORD"];

  if (!email || !password) {
    throw new Error(
      "CLERK_TEST_EMAIL and CLERK_TEST_PASSWORD must be set for auth tests",
    );
  }

  return { email, password };
}

/**
 * Generate a unique email for signup tests to avoid conflicts.
 * Uses a timestamp suffix on the test domain.
 */
export function generateSignupEmail(): string {
  const timestamp = Date.now();
  const domain = process.env["CLERK_TEST_DOMAIN"] ?? "test.apifold.dev";
  return `e2e-signup-${timestamp}@${domain}`;
}

/**
 * Stripe test card numbers for billing tests.
 */
export const STRIPE_TEST_CARDS = {
  visa: "4242424242424242",
  visaDeclined: "4000000000000002",
  requiresAuth: "4000002500003155",
} as const;

export const STRIPE_TEST_CARD_DETAILS = {
  expiry: "12/30",
  cvc: "123",
  zip: "10001",
} as const;
