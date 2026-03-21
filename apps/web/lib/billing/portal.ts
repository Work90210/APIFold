import { stripe } from "./stripe-client";

function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url && process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL is required in production");
  }
  return url ?? "http://localhost:3000";
}

export interface PortalResult {
  readonly url: string;
}

export async function createPortalSession(
  stripeCustomerId: string,
): Promise<PortalResult> {
  if (!stripeCustomerId) {
    throw new Error("Stripe customer ID is required for billing portal");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${getAppUrl()}/dashboard/settings`,
  });

  return Object.freeze({
    url: session.url,
  });
}
