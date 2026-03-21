import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkServerLimit, checkRequestLimit } from "@/lib/billing/plan-enforcer";
import { PLANS } from "@/lib/billing/plans";

const mockWhere = vi.fn();

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: mockWhere,
      }),
    }),
  })),
}));

vi.mock("@/lib/billing/usage-tracker", () => ({
  getMonthlyUsage: vi.fn(),
}));

import { getMonthlyUsage } from "@/lib/billing/usage-tracker";

const mockGetMonthlyUsage = vi.mocked(getMonthlyUsage);

describe("Plan Enforcer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkServerLimit", () => {
    it("allows creation when under free tier limit", async () => {
      mockWhere.mockResolvedValueOnce([{ count: 1 }]);

      const result = await checkServerLimit("user-1", PLANS.free);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
      expect(result.max).toBe(2);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it("blocks creation when at free tier limit", async () => {
      mockWhere.mockResolvedValueOnce([{ count: 2 }]);

      const result = await checkServerLimit("user-1", PLANS.free);

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(2);
      expect(result.max).toBe(2);
    });

    it("allows creation on starter tier within limit", async () => {
      mockWhere.mockResolvedValueOnce([{ count: 5 }]);

      const result = await checkServerLimit("user-1", PLANS.starter);

      expect(result.allowed).toBe(true);
      expect(result.max).toBe(10);
    });

    it("always allows on pro tier (Infinity)", async () => {
      mockWhere.mockResolvedValueOnce([{ count: 999 }]);

      const result = await checkServerLimit("user-1", PLANS.pro);

      expect(result.allowed).toBe(true);
      expect(result.max).toBe(Infinity);
    });

    it("handles empty result gracefully", async () => {
      mockWhere.mockResolvedValueOnce([]);

      const result = await checkServerLimit("user-1", PLANS.free);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
    });
  });

  describe("checkRequestLimit", () => {
    it("allows requests when under free tier limit", async () => {
      mockGetMonthlyUsage.mockResolvedValueOnce(500);

      const result = await checkRequestLimit("user-1", PLANS.free);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(500);
      expect(result.current).toBe(500);
      expect(result.max).toBe(1_000);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it("blocks requests when at free tier limit", async () => {
      mockGetMonthlyUsage.mockResolvedValueOnce(1_000);

      const result = await checkRequestLimit("user-1", PLANS.free);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("allows requests on starter tier within limit", async () => {
      mockGetMonthlyUsage.mockResolvedValueOnce(25_000);

      const result = await checkRequestLimit("user-1", PLANS.starter);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(25_000);
    });

    it("always allows on enterprise tier (Infinity)", async () => {
      mockGetMonthlyUsage.mockResolvedValueOnce(10_000_000);

      const result = await checkRequestLimit("user-1", PLANS.enterprise);

      expect(result.allowed).toBe(true);
      expect(result.max).toBe(Infinity);
    });
  });
});
