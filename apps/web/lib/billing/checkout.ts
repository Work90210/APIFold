import { stripe } from "./stripe-client";
import { getPlanById } from "./plans";
import { getAppUrl } from "@/lib/url";

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
