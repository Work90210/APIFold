/** Retry schedule in minutes: attempt 2→+5m, 3→+30m, 4→+2h, 5→+12h */
const RETRY_DELAYS_MINUTES: ReadonlyArray<number> = [5, 30, 120, 720];

const MAX_ATTEMPTS = 5;
const MAX_JITTER_MS = 30_000;

export function nextRetryTime(
  attemptCount: number,
  now: Date,
): Date | null {
  const delayIndex = attemptCount - 1;
  if (delayIndex < 0 || delayIndex >= RETRY_DELAYS_MINUTES.length) return null;
  if (attemptCount >= MAX_ATTEMPTS) return null;

  const delayMs = RETRY_DELAYS_MINUTES[delayIndex]! * 60_000;
  const jitterMs = Math.floor(Math.random() * MAX_JITTER_MS);

  return new Date(now.getTime() + delayMs + jitterMs);
}

const PERMANENT_ERROR_CODES = new Set([
  "invalid_recipient",
  "validation_error",
  "missing_required_field",
  "not_found",
]);

export function isRetryableError(code: string): boolean {
  return !PERMANENT_ERROR_CODES.has(code);
}
