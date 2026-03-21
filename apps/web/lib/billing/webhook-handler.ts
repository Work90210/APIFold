import type Stripe from "stripe";
import { stripe } from "./stripe-client";
import { PLANS, getPlanByStripeProductId, getPlanById } from "./plans";
import { clerkClient } from "@clerk/nextjs/server";
import { getRedis } from "@/lib/redis";
import type { Plan } from "./plans";

export function verifyWebhookSignature(
  body: string,
  signature: string,
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is required");
  }

  return stripe.webhooks.constructEvent(body, signature, secret);
}

const DEDUP_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const PLAN_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

async function syncPlanLimitsToRedis(
  userId: string,
  plan: Plan,
): Promise<void> {
  try {
    const redis = getRedis();

    // Preserve existing budget cap set by the user
    const existingCap = await redis.get(`budget:cap:${userId}`);
    const parsedCap = existingCap !== null ? parseInt(existingCap, 10) : null;
    const budgetCapCents =
      parsedCap !== null && Number.isFinite(parsedCap) ? parsedCap : null;

    // Replace Infinity with a large sentinel for JSON/Lua safety
    const maxReq = Number.isFinite(plan.maxRequestsPerMonth)
      ? plan.maxRequestsPerMonth
      : Number.MAX_SAFE_INTEGER;

    const limits = JSON.stringify({
      maxRequestsPerMonth: maxReq,
      overageRate: plan.overageRate,
      budgetCapCents,
    });
    await redis.set(`plan:${userId}`, limits, "EX", PLAN_CACHE_TTL_SECONDS);
  } catch (err) {
    console.error("[webhook] Failed to sync plan limits to Redis:", err);
  }
}

async function isEventProcessed(eventId: string): Promise<boolean> {
  try {
    const redis = getRedis();
    const result = await redis.set(
      `webhook:processed:${eventId}`,
      "1",
      "EX",
      DEDUP_TTL_SECONDS,
      "NX",
    );
    // NX returns null if key already exists (event already processed)
    return result === null;
  } catch (err) {
    console.error("[webhook] Redis dedup check failed:", err);
    // Fail open — process the event rather than silently dropping it
    return false;
  }
}

export async function handleWebhookEvent(
  event: Stripe.Event,
): Promise<{ readonly handled: boolean; readonly action: string }> {
  // Idempotency: skip already-processed events
  if (await isEventProcessed(event.id)) {
    return Object.freeze({ handled: false, action: "duplicate" });
  }

  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutCompleted(
        event.data.object as Stripe.Checkout.Session,
      );

    case "customer.subscription.updated":
      return handleSubscriptionUpdated(
        event.data.object as Stripe.Subscription,
      );

    case "customer.subscription.deleted":
      return handleSubscriptionDeleted(
        event.data.object as Stripe.Subscription,
      );

    case "invoice.payment_failed":
      return handlePaymentFailed(event.data.object as Stripe.Invoice);

    default:
      return Object.freeze({ handled: false, action: "ignored" });
  }
}

const CUSTOMER_MAP_TTL = 90 * 24 * 60 * 60; // 90 days

function customerMapKey(customerId: string): string {
  return `stripe:customer:${customerId}`;
}

async function storeCustomerMapping(
  customerId: string,
  userId: string,
): Promise<void> {
  try {
    const redis = getRedis();
    await redis.set(customerMapKey(customerId), userId, "EX", CUSTOMER_MAP_TTL);
  } catch (err) {
    console.error("[webhook] Failed to store customer mapping:", err);
  }
}

async function findUserByStripeCustomerId(
  customerId: string,
): Promise<{ id: string } | null> {
  // O(1) lookup via Redis reverse index
  try {
    const redis = getRedis();
    const userId = await redis.get(customerMapKey(customerId));
    if (userId) return { id: userId };
  } catch (err) {
    console.error("[webhook] Redis customer lookup failed:", err);
  }

  // Fallback: scan Clerk users (slow but correct)
  try {
    const clerk = await clerkClient();
    let offset = 0;
    const limit = 100;

    while (offset < 1000) {
      const users = await clerk.users.getUserList({ limit, offset });

      for (const user of users.data) {
        if (user.publicMetadata?.stripeCustomerId === customerId) {
          // Cache for next time
          await storeCustomerMapping(customerId, user.id);
          return { id: user.id };
        }
      }

      if (users.data.length < limit) break;
      offset += limit;
    }
  } catch (err) {
    console.error("[webhook] Clerk user scan failed:", err);
  }

  return null;
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<{ readonly handled: boolean; readonly action: string }> {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;

  if (!userId || !planId) {
    return Object.freeze({
      handled: false,
      action: "missing_metadata",
    });
  }

  const customerId = session.customer as string;

  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: {
      plan: planId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: session.subscription as string,
    },
  });

  // Store reverse index for O(1) lookup in future webhook events
  if (customerId) {
    await storeCustomerMapping(customerId, userId);
  }

  // Sync plan limits to Redis for runtime enforcement
  const activatedPlan = getPlanById(planId);
  if (activatedPlan) {
    await syncPlanLimitsToRedis(userId, activatedPlan);
  }

  return Object.freeze({ handled: true, action: "plan_activated" });
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
): Promise<{ readonly handled: boolean; readonly action: string }> {
  const productId = subscription.items.data[0]?.price?.product as string;
  if (!productId) {
    return Object.freeze({ handled: false, action: "no_product_id" });
  }

  const plan = getPlanByStripeProductId(productId);
  if (!plan) {
    return Object.freeze({ handled: false, action: "unknown_product" });
  }

  const customerId = subscription.customer as string;
  const user = await findUserByStripeCustomerId(customerId);
  if (!user) {
    return Object.freeze({ handled: false, action: "user_not_found" });
  }

  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(user.id, {
    publicMetadata: {
      plan: plan.id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
    },
  });

  await syncPlanLimitsToRedis(user.id, plan);

  return Object.freeze({ handled: true, action: "plan_changed" });
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<{ readonly handled: boolean; readonly action: string }> {
  const customerId = subscription.customer as string;
  const user = await findUserByStripeCustomerId(customerId);
  if (!user) {
    return Object.freeze({ handled: false, action: "user_not_found" });
  }

  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(user.id, {
    publicMetadata: {
      plan: "free",
      stripeCustomerId: customerId,
      stripeSubscriptionId: null,
    },
  });

  await syncPlanLimitsToRedis(user.id, PLANS.free);

  return Object.freeze({ handled: true, action: "reverted_to_free" });
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<{ readonly handled: boolean; readonly action: string }> {
  const customerId = invoice.customer as string;
  const user = await findUserByStripeCustomerId(customerId);
  if (!user) {
    return Object.freeze({ handled: false, action: "user_not_found" });
  }

  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(user.id, {
    privateMetadata: {
      paymentFailedAt: new Date().toISOString(),
      paymentFailedInvoiceId: invoice.id,
    },
  });

  return Object.freeze({ handled: true, action: "account_flagged" });
}
