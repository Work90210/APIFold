import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/billing/stripe-client", () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}));

vi.mock("@/lib/redis", () => {
  const mockSet = vi.fn().mockResolvedValue("OK");
  return {
    getRedis: vi.fn(() => ({ set: mockSet })),
    __mockSet: mockSet,
  };
});

vi.mock("@clerk/nextjs/server", () => {
  const updateUserMetadata = vi.fn().mockResolvedValue({});
  const getUserList = vi.fn().mockResolvedValue({
    data: [
      {
        id: "user-1",
        publicMetadata: { stripeCustomerId: "cus_123" },
      },
    ],
  });
  return {
    clerkClient: vi.fn().mockResolvedValue({
      users: { updateUserMetadata, getUserList },
    }),
    __mockUpdateUserMetadata: updateUserMetadata,
    __mockGetUserList: getUserList,
  };
});

vi.mock("@/lib/billing/plans", () => {
  const freePlan = { id: "free", name: "Free", maxRequestsPerMonth: 1000, overageRate: 0 };
  const proPlan = { id: "pro", name: "Pro", maxRequestsPerMonth: 500000, overageRate: 0.00005 };
  return {
    PLANS: { free: freePlan, pro: proPlan },
    getPlanById: vi.fn((id: string) => id === "pro" ? proPlan : freePlan),
    getPlanByStripeProductId: vi.fn().mockReturnValue(proPlan),
  };
});

import {
  verifyWebhookSignature,
  handleWebhookEvent,
} from "@/lib/billing/webhook-handler";
import { stripe } from "@/lib/billing/stripe-client";
// @ts-expect-error — mock exports from vi.mock factory
import { __mockUpdateUserMetadata, __mockGetUserList } from "@clerk/nextjs/server";
// @ts-expect-error — mock export from vi.mock factory
import { __mockSet } from "@/lib/redis";
import type Stripe from "stripe";

const mockConstructEvent = vi.mocked(stripe.webhooks.constructEvent);
const mockUpdateUserMetadata = __mockUpdateUserMetadata as ReturnType<typeof vi.fn>;
const mockGetUserList = __mockGetUserList as ReturnType<typeof vi.fn>;
const mockRedisSet = __mockSet as ReturnType<typeof vi.fn>;

describe("Webhook Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test_secret");
    mockRedisSet.mockResolvedValue("OK");
    mockGetUserList.mockResolvedValue({
      data: [
        {
          id: "user-1",
          publicMetadata: { stripeCustomerId: "cus_123" },
        },
      ],
    });
  });

  describe("verifyWebhookSignature", () => {
    it("returns event when signature is valid", () => {
      const mockEvent = { type: "checkout.session.completed" } as Stripe.Event;
      mockConstructEvent.mockReturnValueOnce(mockEvent);

      const event = verifyWebhookSignature("body", "sig_valid");

      expect(event.type).toBe("checkout.session.completed");
      expect(mockConstructEvent).toHaveBeenCalledWith(
        "body",
        "sig_valid",
        "whsec_test_secret",
      );
    });

    it("throws when signature is invalid", () => {
      mockConstructEvent.mockImplementationOnce(() => {
        throw new Error("Invalid signature");
      });

      expect(() => verifyWebhookSignature("body", "sig_bad")).toThrow(
        "Invalid signature",
      );
    });
  });

  describe("handleWebhookEvent", () => {
    it("handles checkout.session.completed", async () => {
      const event = {
        id: "evt_checkout_1",
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: { userId: "user-1", planId: "pro" },
            customer: "cus_123",
            subscription: "sub_456",
          },
        },
      } as unknown as Stripe.Event;

      const result = await handleWebhookEvent(event);

      expect(result.handled).toBe(true);
      expect(result.action).toBe("plan_activated");
      expect(Object.isFrozen(result)).toBe(true);
    });

    it("handles customer.subscription.updated", async () => {
      const event = {
        id: "evt_sub_update_1",
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_456",
            customer: "cus_123",
            items: {
              data: [{ price: { product: "prod_pro" } }],
            },
          },
        },
      } as unknown as Stripe.Event;

      const result = await handleWebhookEvent(event);

      expect(result.handled).toBe(true);
      expect(result.action).toBe("plan_changed");
    });

    it("handles customer.subscription.deleted", async () => {
      const event = {
        id: "evt_sub_delete_1",
        type: "customer.subscription.deleted",
        data: {
          object: {
            customer: "cus_123",
          },
        },
      } as unknown as Stripe.Event;

      const result = await handleWebhookEvent(event);

      expect(result.handled).toBe(true);
      expect(result.action).toBe("reverted_to_free");
    });

    it("handles invoice.payment_failed", async () => {
      const event = {
        id: "evt_invoice_fail_1",
        type: "invoice.payment_failed",
        data: {
          object: {
            id: "inv_789",
            customer: "cus_123",
          },
        },
      } as unknown as Stripe.Event;

      const result = await handleWebhookEvent(event);

      expect(result.handled).toBe(true);
      expect(result.action).toBe("account_flagged");
    });

    it("ignores unhandled event types", async () => {
      const event = {
        id: "evt_unknown_1",
        type: "payment_intent.created",
        data: { object: {} },
      } as unknown as Stripe.Event;

      const result = await handleWebhookEvent(event);

      expect(result.handled).toBe(false);
      expect(result.action).toBe("ignored");
    });

    it("returns missing_metadata when checkout lacks userId", async () => {
      const event = {
        id: "evt_checkout_no_meta",
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: {},
            customer: "cus_123",
          },
        },
      } as unknown as Stripe.Event;

      const result = await handleWebhookEvent(event);

      expect(result.handled).toBe(false);
      expect(result.action).toBe("missing_metadata");
    });

    it("skips duplicate events (idempotency)", async () => {
      // Simulate key already existing (NX returns null = already processed)
      mockRedisSet.mockResolvedValueOnce(null);

      const event = {
        id: "evt_duplicate_1",
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: { userId: "user-1", planId: "pro" },
            customer: "cus_123",
            subscription: "sub_456",
          },
        },
      } as unknown as Stripe.Event;

      const result = await handleWebhookEvent(event);

      expect(result.handled).toBe(false);
      expect(result.action).toBe("duplicate");
      expect(mockUpdateUserMetadata).not.toHaveBeenCalled();
    });

    it("returns user_not_found when customer ID has no matching user", async () => {
      mockGetUserList.mockResolvedValue({ data: [] });

      const event = {
        id: "evt_no_user_1",
        type: "customer.subscription.deleted",
        data: {
          object: { customer: "cus_nonexistent" },
        },
      } as unknown as Stripe.Event;

      const result = await handleWebhookEvent(event);

      expect(result.handled).toBe(false);
      expect(result.action).toBe("user_not_found");
    });
  });
});
