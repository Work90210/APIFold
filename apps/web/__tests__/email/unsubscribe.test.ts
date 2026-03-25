import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/url", () => ({
  getAppUrl: () => "https://app.test.com",
}));

// Set up env before importing
process.env.EMAIL_UNSUBSCRIBE_SECRET = "test-secret-key-that-is-long-enough";

import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
  emailTypeToScope,
  createUnsubscribeUrl,
} from "@/lib/email/unsubscribe";

describe("unsubscribe", () => {
  describe("createUnsubscribeToken / verifyUnsubscribeToken", () => {
    it("roundtrips successfully", () => {
      const token = createUnsubscribeToken("user_1", "weekly_usage_summary");
      const claims = verifyUnsubscribeToken(token);

      expect(claims).not.toBeNull();
      expect(claims!.userId).toBe("user_1");
      expect(claims!.scope).toBe("weekly_usage_summary");
      expect(claims!.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it("rejects tampered tokens", () => {
      const token = createUnsubscribeToken("user_1", "weekly_usage_summary");
      const tampered = token.slice(0, -5) + "XXXXX";
      expect(verifyUnsubscribeToken(tampered)).toBeNull();
    });

    it("rejects malformed tokens", () => {
      expect(verifyUnsubscribeToken("")).toBeNull();
      expect(verifyUnsubscribeToken("not-a-token")).toBeNull();
      expect(verifyUnsubscribeToken("a.b.c")).toBeNull();
    });
  });

  describe("emailTypeToScope", () => {
    it("maps optional email types to scopes", () => {
      expect(emailTypeToScope("weekly_usage_summary")).toBe(
        "weekly_usage_summary",
      );
      expect(emailTypeToScope("renewal_reminder")).toBe("renewal_reminder");
      expect(emailTypeToScope("overage_alert")).toBe("overage_alert");
    });

    it("returns null for critical email types", () => {
      expect(emailTypeToScope("welcome")).toBeNull();
      expect(emailTypeToScope("payment_failed")).toBeNull();
      expect(emailTypeToScope("account_deleted")).toBeNull();
    });
  });

  describe("createUnsubscribeUrl", () => {
    it("includes app URL and encoded token", () => {
      const url = createUnsubscribeUrl("user_1", "weekly_usage_summary");
      expect(url).toContain("https://app.test.com/email/unsubscribe?token=");
    });
  });
});
