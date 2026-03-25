import { describe, it, expect } from "vitest";
import { nextRetryTime, isRetryableError } from "@/lib/email/retry";

describe("retry", () => {
  describe("nextRetryTime", () => {
    const now = new Date("2026-03-25T12:00:00Z");

    it("returns ~5min for attempt 1", () => {
      const retry = nextRetryTime(1, now);
      expect(retry).not.toBeNull();
      // 5 min = 300_000ms, plus up to 30s jitter
      const diff = retry!.getTime() - now.getTime();
      expect(diff).toBeGreaterThanOrEqual(300_000);
      expect(diff).toBeLessThanOrEqual(330_000);
    });

    it("returns ~30min for attempt 2", () => {
      const retry = nextRetryTime(2, now);
      expect(retry).not.toBeNull();
      const diff = retry!.getTime() - now.getTime();
      expect(diff).toBeGreaterThanOrEqual(1_800_000);
      expect(diff).toBeLessThanOrEqual(1_830_000);
    });

    it("returns ~2hr for attempt 3", () => {
      const retry = nextRetryTime(3, now);
      expect(retry).not.toBeNull();
      const diff = retry!.getTime() - now.getTime();
      expect(diff).toBeGreaterThanOrEqual(7_200_000);
    });

    it("returns ~12hr for attempt 4", () => {
      const retry = nextRetryTime(4, now);
      expect(retry).not.toBeNull();
      const diff = retry!.getTime() - now.getTime();
      expect(diff).toBeGreaterThanOrEqual(43_200_000);
    });

    it("returns null for attempt 5 (max exceeded)", () => {
      expect(nextRetryTime(5, now)).toBeNull();
    });

    it("returns null for attempt 0", () => {
      expect(nextRetryTime(0, now)).toBeNull();
    });
  });

  describe("isRetryableError", () => {
    it("classifies permanent errors", () => {
      expect(isRetryableError("invalid_recipient")).toBe(false);
      expect(isRetryableError("validation_error")).toBe(false);
      expect(isRetryableError("not_found")).toBe(false);
    });

    it("classifies retryable errors", () => {
      expect(isRetryableError("rate_limited")).toBe(true);
      expect(isRetryableError("server_error")).toBe(true);
      expect(isRetryableError("fetch_error")).toBe(true);
    });
  });
});
