export type PlanId = "free" | "starter" | "pro" | "enterprise";

export interface Plan {
  readonly id: PlanId;
  readonly name: string;
  readonly stripeProductId: string | null;
  readonly stripePriceId: string | null;
  readonly maxServers: number;
  readonly maxRequestsPerMonth: number;
  readonly logRetentionDays: number;
  readonly overageRate: number;
  readonly priceEurMonth: number;
}

export const PLANS: Readonly<Record<PlanId, Plan>> = Object.freeze({
  free: Object.freeze({
    id: "free" as const,
    name: "Free",
    stripeProductId: null,
    stripePriceId: null,
    maxServers: 2,
    maxRequestsPerMonth: 1_000,
    logRetentionDays: 7,
    overageRate: 0,
    priceEurMonth: 0,
  }),
  starter: Object.freeze({
    id: "starter" as const,
    name: "Starter",
    stripeProductId: process.env.STRIPE_STARTER_PRODUCT_ID ?? null,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID ?? null,
    maxServers: 10,
    maxRequestsPerMonth: 50_000,
    logRetentionDays: 30,
    overageRate: 0.00005,
    priceEurMonth: 9,
  }),
  pro: Object.freeze({
    id: "pro" as const,
    name: "Pro",
    stripeProductId: process.env.STRIPE_PRO_PRODUCT_ID ?? null,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID ?? null,
    maxServers: Infinity,
    maxRequestsPerMonth: 500_000,
    logRetentionDays: 90,
    overageRate: 0.00005,
    priceEurMonth: 29,
  }),
  enterprise: Object.freeze({
    id: "enterprise" as const,
    name: "Enterprise",
    stripeProductId: null,
    stripePriceId: null,
    maxServers: Infinity,
    maxRequestsPerMonth: Infinity,
    logRetentionDays: Infinity,
    overageRate: 0,
    priceEurMonth: 0,
  }),
});

export function getPlanById(id: string): Plan | undefined {
  return (PLANS as Record<string, Plan>)[id];
}

export function getPlanByStripeProductId(productId: string): Plan | undefined {
  return Object.values(PLANS).find((p) => p.stripeProductId === productId);
}
