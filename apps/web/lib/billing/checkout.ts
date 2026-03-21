import { stripe } from "./stripe-client";
import { getPlanById } from "./plans";

function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url && process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL is required in production");
  }
  return url ?? "http://localhost:3000";
}

export interface CheckoutResult {
  readonly url: string;
  readonly sessionId: string;
}

export async function createCheckoutSession(
  userId: string,
  planId: string,
  stripeCustomerId?: string,
): Promise<CheckoutResult> {
  const plan = getPlanById(planId);
  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`);
  }

  if (!plan.stripePriceId) {
    throw new Error(`Plan "${planId}" does not support checkout`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId || undefined,
    line_items: [
      {
        price: plan.stripePriceId,
        quantity: 1,
      },
    ],
    metadata: {
      userId,
      planId,
    },
    success_url: `${getAppUrl()}/dashboard/settings?checkout=success`,
    cancel_url: `${getAppUrl()}/dashboard/settings?checkout=cancelled`,
  });

  if (!session.url) {
    throw new Error("Stripe returned a session without a URL");
  }

  return Object.freeze({
    url: session.url,
    sessionId: session.id,
  });
}
