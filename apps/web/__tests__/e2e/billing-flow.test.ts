import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * E2E-style integration test for the full billing flow.
 * Tests the API layer end-to-end (checkout → webhook → plan change).
 *
 * Note: This doesn't test the actual Stripe redirect or UI interaction,
 * but validates the server-side flow that handles the billing lifecycle.
 */

// Mock all external dependencies
vi.mock("@clerk/nextjs/server", () => {
  const metadata: Record<string, Record<string, unknown>> = {};
  return {
    auth: vi.fn().mockResolvedValue({ userId: "user_e2e_test" }),
    clerkClient: vi.fn().mockResolvedValue({
      users: {
        getUser: vi.fn().mockImplementation((userId: string) => ({
          id: userId,
          publicMetadata: metadata[userId] ?? { plan: "free" },
        })),
        updateUserMetadata: vi
          .fn()
          .mockImplementation(
            (
              userId: string,
              update: {
                publicMetadata?: Record<string, unknown>;
                privateMetadata?: Record<string, unknown>;
              },
            ) => {
              metadata[userId] = {
                ...metadata[userId],
                ...update.publicMetadata,
              };
              return metadata[userId];
            },
          ),
        getUserList: vi.fn().mockResolvedValue({ data: [] }),
      },
    }),
    __metadata: metadata,
  };
});

vi.mock("@/lib/billing/stripe-client", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: "cs_test_session",
          url: "https://checkout.stripe.com/test",
        }),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          url: "https://billing.stripe.com/test",
        }),
      },
    },
    webhooks: {
      constructEvent: vi.fn().mockImplementation((body: string) => {
        return JSON.parse(body);
      }),
    },
  },
  getStripe: vi.fn(),
}));

vi.mock("@/lib/redis", () => {
  const store: Record<string, string> = {};
  return {
    getRedis: vi.fn(() => ({
      get: vi.fn((key: string) => Promise.resolve(store[key] ?? null)),
      set: vi.fn(
        (key: string, value: string, ..._args: unknown[]) => {
          // Simulate NX behavior: return null if key exists, "OK" if new
          if (_args.includes("NX") && store[key] !== undefined) {
            return Promise.resolve(null);
          }
          store[key] = value;
          return Promise.resolve("OK");
        },
      ),
      expire: vi.fn().mockResolvedValue(1),
      pipeline: vi.fn(() => ({
        incr: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          [null, 1],
          [null, 1],
        ]),
      })),
    })),
    publishServerEvent: vi.fn(),
    __store: store,
  };
});

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      }),
    }),
  })),
}));

vi.mock("@/lib/db/schema", () => ({
  mcpServers: { userId: "userId", isActive: "isActive" },
  usageEvents: {},
}));

vi.mock("@/lib/billing/plans", () => {
  const plans = {
    free: { id: "free", name: "Free", stripeProductId: null, stripePriceId: null, maxServers: 2, maxRequestsPerMonth: 1000, logRetentionDays: 7, overageRate: 0, priceEurMonth: 0 },
    starter: { id: "starter", name: "Starter", stripeProductId: "prod_test_starter", stripePriceId: "price_test_starter", maxServers: 10, maxRequestsPerMonth: 50000, logRetentionDays: 30, overageRate: 0.00005, priceEurMonth: 9 },
    pro: { id: "pro", name: "Pro", stripeProductId: "prod_test_pro", stripePriceId: "price_test_pro", maxServers: Infinity, maxRequestsPerMonth: 500000, logRetentionDays: 90, overageRate: 0.00005, priceEurMonth: 29 },
    enterprise: { id: "enterprise", name: "Enterprise", stripeProductId: null, stripePriceId: null, maxServers: Infinity, maxRequestsPerMonth: Infinity, logRetentionDays: Infinity, overageRate: 0, priceEurMonth: 0 },
  };
  return {
    PLANS: plans,
    getPlanById: (id: string) => (plans as Record<string, unknown>)[id],
    getPlanByStripeProductId: (productId: string) => Object.values(plans).find((p: any) => p.stripeProductId === productId),
  };
});

import { createCheckoutSession } from "@/lib/billing/checkout";
import { createPortalSession } from "@/lib/billing/portal";
import {
  verifyWebhookSignature,
  handleWebhookEvent,
} from "@/lib/billing/webhook-handler";
import { checkServerLimit, checkRequestLimit } from "@/lib/billing/plan-enforcer";
import { PLANS } from "@/lib/billing/plans";

describe("Billing E2E Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("STRIPE_STARTER_PRODUCT_ID", "prod_test_starter");
    vi.stubEnv("STRIPE_STARTER_PRICE_ID", "price_test_starter");
    vi.stubEnv("STRIPE_PRO_PRODUCT_ID", "prod_test_pro");
    vi.stubEnv("STRIPE_PRO_PRICE_ID", "price_test_pro");
  });

  it("complete upgrade lifecycle: free → checkout → webhook → starter limits", async () => {
    // Step 1: User is on free plan, check limits
    const freeLimits = await checkServerLimit("user_e2e_test", PLANS.free);
    expect(freeLimits.allowed).toBe(true);
    expect(freeLimits.max).toBe(2);

    // Step 2: User initiates checkout for starter plan
    const checkout = await createCheckoutSession("user_e2e_test", "starter");
    expect(checkout.url).toBe("https://checkout.stripe.com/test");
    expect(checkout.sessionId).toBe("cs_test_session");

    // Step 3: Stripe sends checkout.session.completed webhook
    const checkoutEvent = {
      id: "evt_checkout_e2e",
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { userId: "user_e2e_test", planId: "starter" },
          customer: "cus_e2e_123",
          subscription: "sub_e2e_456",
        },
      },
    };

    const result = await handleWebhookEvent(checkoutEvent as any);
    expect(result.handled).toBe(true);
    expect(result.action).toBe("plan_activated");

    // Step 4: Verify Clerk metadata was updated
    // @ts-expect-error — test mock export
    const { __metadata } = await import("@clerk/nextjs/server");
    expect(__metadata["user_e2e_test"]).toMatchObject({
      plan: "starter",
      stripeCustomerId: "cus_e2e_123",
      stripeSubscriptionId: "sub_e2e_456",
    });

    // Step 5: Check new plan limits (starter)
    const starterLimits = await checkServerLimit("user_e2e_test", PLANS.starter);
    expect(starterLimits.max).toBe(10);

    const requestLimits = await checkRequestLimit("user_e2e_test", PLANS.starter);
    expect(requestLimits.max).toBe(50_000);
    expect(requestLimits.allowed).toBe(true);
  });

  it("portal session creation works for paid users", async () => {
    const portal = await createPortalSession("cus_e2e_123");
    expect(portal.url).toBe("https://billing.stripe.com/test");
  });

  it("subscription deletion reverts to free plan", async () => {
    // Set up: user has starter plan with known customer ID
    // @ts-expect-error — test mock export
    const { __metadata } = await import("@clerk/nextjs/server");
    __metadata["user_e2e_test"] = {
      plan: "starter",
      stripeCustomerId: "cus_e2e_123",
    };

    // Store reverse mapping in Redis
    // @ts-expect-error — test mock export
    const { __store } = await import("@/lib/redis");
    __store["stripe:customer:cus_e2e_123"] = "user_e2e_test";

    const deleteEvent = {
      id: "evt_delete_e2e",
      type: "customer.subscription.deleted",
      data: {
        object: { customer: "cus_e2e_123" },
      },
    };

    const result = await handleWebhookEvent(deleteEvent as any);
    expect(result.handled).toBe(true);
    expect(result.action).toBe("reverted_to_free");
    expect(__metadata["user_e2e_test"].plan).toBe("free");
  });

  it("duplicate webhook events are rejected (idempotency)", async () => {
    const event = {
      id: "evt_dup_test",
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { userId: "user_e2e_test", planId: "pro" },
          customer: "cus_dup",
          subscription: "sub_dup",
        },
      },
    };

    // First call: NX succeeds (key doesn't exist), event is processed
    const first = await handleWebhookEvent(event as any);
    expect(first.handled).toBe(true);
    expect(first.action).toBe("plan_activated");

    // Second call: same event ID — NX returns null (key exists), event is skipped
    const second = await handleWebhookEvent(event as any);
    expect(second.handled).toBe(false);
    expect(second.action).toBe("duplicate");
  });

  it("free plan enforces hard cap at 1000 requests", async () => {
    const limitCheck = await checkRequestLimit("user_e2e_test", PLANS.free);
    // With mocked Redis returning 0 usage, should be allowed
    expect(limitCheck.allowed).toBe(true);
    expect(limitCheck.max).toBe(1_000);
  });
});
