import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPipeline = {
  incr: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  exec: vi.fn(),
};

const mockRedis = {
  get: vi.fn(),
  pipeline: vi.fn(() => mockPipeline),
};

vi.mock("@/lib/redis", () => ({
  getRedis: vi.fn(() => mockRedis),
}));

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  })),
}));

vi.mock("@/lib/db/schema", () => ({
  usageEvents: {},
}));

import { incrementUsage, getMonthlyUsage } from "@/lib/billing/usage-tracker";

describe("Usage Tracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("incrementUsage", () => {
    it("increments counter in Redis", async () => {
      mockPipeline.exec.mockResolvedValueOnce([
        [null, 42],
        [null, 1],
      ]);

      const count = await incrementUsage("user-1");

      expect(count).toBe(42);
      expect(mockPipeline.incr).toHaveBeenCalledTimes(1);
      expect(mockPipeline.expire).toHaveBeenCalledTimes(1);
    });

    it("throws when Redis pipeline fails", async () => {
      mockPipeline.exec.mockResolvedValueOnce(null);

      await expect(incrementUsage("user-1")).rejects.toThrow(
        "Redis pipeline failed",
      );
    });

    it("throws when Redis returns error", async () => {
      const error = new Error("Redis connection lost");
      mockPipeline.exec.mockResolvedValueOnce([
        [error, null],
        [null, 1],
      ]);

      await expect(incrementUsage("user-1")).rejects.toThrow(
        "Redis connection lost",
      );
    });
  });

  describe("getMonthlyUsage", () => {
    it("returns count from Redis", async () => {
      mockRedis.get.mockResolvedValueOnce("1500");

      const usage = await getMonthlyUsage("user-1");

      expect(usage).toBe(1500);
    });

    it("returns 0 when key does not exist", async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const usage = await getMonthlyUsage("user-1");

      expect(usage).toBe(0);
    });
  });
});
