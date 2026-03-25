import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getAppUrl before importing intent-builder
vi.mock("@/lib/url", () => ({
  getAppUrl: () => "https://app.test.com",
}));

import {
  buildWelcomeIntent,
  buildPaymentFailedIntent,
  buildUsageWarningIntent,
  buildAccountDeletedIntent,
  buildPlanChangedIntent,
  buildSubscriptionCancelledIntent,
  buildWeeklySummaryIntent,
  buildSecurityAlertIntent,
} from "@/lib/email/intent-builder";

describe("intent-builder", () => {
  describe("buildWelcomeIntent", () => {
    it("returns immutable intent with correct idempotency key", () => {
      const intent = buildWelcomeIntent(
        "user@test.com",
        "Kyle",
        "evt_123",
      );

      expect(intent.type).toBe("welcome");
      expect(intent.category).toBe("transactional");
      expect(intent.idempotencyKey).toBe("welcome:evt_123");
      expect(intent.toEmail).toBe("user@test.com");
      expect(intent.payload).toMatchObject({
        firstName: "Kyle",
        dashboardUrl: "https://app.test.com/dashboard",
      });
      expect(intent.priority).toBe(1); // high
      expect(Object.isFrozen(intent)).toBe(true);
    });

    it("handles null firstName", () => {
      const intent = buildWelcomeIntent("user@test.com", null, "evt_456");
      expect(intent.payload.firstName).toBeNull();
    });
  });

  describe("buildPaymentFailedIntent", () => {
    it("creates critical priority intent", () => {
      const intent = buildPaymentFailedIntent(
        "user_1",
        "user@test.com",
        "Kyle",
        "€29.00",
        "inv_123",
        "2026-04-01",
      );

      expect(intent.type).toBe("payment_failed");
      expect(intent.category).toBe("billing");
      expect(intent.idempotencyKey).toBe("payment_failed:inv_123");
      expect(intent.priority).toBe(0); // critical
      expect(intent.payload.billingUrl).toBe(
        "https://app.test.com/dashboard/settings",
      );
    });
  });

  describe("buildUsageWarningIntent", () => {
    it("includes billing month in idempotency key", () => {
      const intent = buildUsageWarningIntent(
        "user_1",
        "user@test.com",
        "Kyle",
        40000,
        50000,
        80,
        "2026-03",
      );

      expect(intent.type).toBe("usage_limit_warning");
      expect(intent.idempotencyKey).toBe("usage_warn:user_1:2026-03:80");
      expect(intent.payload.percentage).toBe(80);
    });
  });

  describe("buildPlanChangedIntent", () => {
    it("uses subscription ID and period in idempotency key", () => {
      const intent = buildPlanChangedIntent(
        "user_1",
        "user@test.com",
        "Kyle",
        "Starter",
        "Pro",
        "sub_123",
        "sub_123",
      );

      expect(intent.type).toBe("plan_changed");
      expect(intent.idempotencyKey).toBe("plan_changed:sub_123:sub_123");
    });
  });

  describe("buildAccountDeletedIntent", () => {
    it("has no userId", () => {
      const intent = buildAccountDeletedIntent("user@test.com", "evt_789");

      expect(intent.userId).toBeNull();
      expect(intent.type).toBe("account_deleted");
      expect(intent.idempotencyKey).toBe("account_deleted:evt_789");
    });
  });

  describe("buildSecurityAlertIntent", () => {
    it("maps new_login to new_login_alert type", () => {
      const intent = buildSecurityAlertIntent(
        "user_1",
        "user@test.com",
        "Kyle",
        "new_login",
        "Chrome on macOS",
      );

      expect(intent.type).toBe("new_login_alert");
      expect(intent.category).toBe("security");
      expect(intent.priority).toBe(0); // critical
    });

    it("maps password_change to password_change_alert type", () => {
      const intent = buildSecurityAlertIntent(
        "user_1",
        "user@test.com",
        "Kyle",
        "password_change",
        "Password updated",
      );

      expect(intent.type).toBe("password_change_alert");
    });
  });
});
