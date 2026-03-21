import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY environment variable is required. " +
        "Set it in your .env.local file.",
    );
  }

  stripeInstance = new Stripe(secretKey, {
    apiVersion: "2026-02-25.clover",
    typescript: true,
  });

  return stripeInstance;
}

// Re-export as `stripe` for backwards compat but prefer `getStripe()`
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
