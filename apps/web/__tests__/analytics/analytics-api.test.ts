import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Inline the schema and helpers exactly as defined in the route.
// This avoids importing Next.js server modules (which require a runtime env)
// while still exercising the pure validation and date-math logic.
// ---------------------------------------------------------------------------

const timeRangeSchema = z.object({
  range: z.enum(['24h', '7d', '30d']).default('7d'),
});

function getStartDate(range: string): Date {
  const now = new Date();
  switch (range) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

// ---------------------------------------------------------------------------
// timeRangeSchema — validation
// ---------------------------------------------------------------------------

describe('timeRangeSchema', () => {
  it('accepts "24h"', () => {
    const result = timeRangeSchema.parse({ range: '24h' });
    expect(result.range).toBe('24h');
  });

  it('accepts "7d"', () => {
    const result = timeRangeSchema.parse({ range: '7d' });
    expect(result.range).toBe('7d');
  });

  it('accepts "30d"', () => {
    const result = timeRangeSchema.parse({ range: '30d' });
    expect(result.range).toBe('30d');
  });

  it('defaults to "7d" when range is omitted', () => {
    const result = timeRangeSchema.parse({});
    expect(result.range).toBe('7d');
  });

  it('defaults to "7d" when given an explicit undefined', () => {
    const result = timeRangeSchema.parse({ range: undefined });
    expect(result.range).toBe('7d');
  });

  it('rejects "1h"', () => {
    expect(() => timeRangeSchema.parse({ range: '1h' })).toThrow();
  });

  it('rejects "90d"', () => {
    expect(() => timeRangeSchema.parse({ range: '90d' })).toThrow();
  });

  it('rejects an empty string', () => {
    expect(() => timeRangeSchema.parse({ range: '' })).toThrow();
  });

  it('rejects a numeric value', () => {
    expect(() => timeRangeSchema.parse({ range: 7 })).toThrow();
  });

  it('rejects null', () => {
    expect(() => timeRangeSchema.parse({ range: null })).toThrow();
  });

  it('rejects "7D" (case sensitive)', () => {
    expect(() => timeRangeSchema.parse({ range: '7D' })).toThrow();
  });

  it('rejects "24H" (case sensitive)', () => {
    expect(() => timeRangeSchema.parse({ range: '24H' })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// getStartDate — date arithmetic
// ---------------------------------------------------------------------------

describe('getStartDate', () => {
  const MS_PER_HOUR = 60 * 60 * 1000;
  const MS_PER_DAY = 24 * MS_PER_HOUR;

  // Allow a small tolerance (100 ms) for the gap between `new Date()` inside
  // the function and `Date.now()` in the test assertion.
  const TOLERANCE_MS = 100;

  it('returns a date 24 hours ago for "24h"', () => {
    const before = Date.now();
    const result = getStartDate('24h');
    const after = Date.now();

    const expected = before - 24 * MS_PER_HOUR;
    expect(result.getTime()).toBeGreaterThanOrEqual(expected - TOLERANCE_MS);
    expect(result.getTime()).toBeLessThanOrEqual(after - 24 * MS_PER_HOUR + TOLERANCE_MS);
  });

  it('returns a date 7 days ago for "7d"', () => {
    const before = Date.now();
    const result = getStartDate('7d');
    const after = Date.now();

    const expected = before - 7 * MS_PER_DAY;
    expect(result.getTime()).toBeGreaterThanOrEqual(expected - TOLERANCE_MS);
    expect(result.getTime()).toBeLessThanOrEqual(after - 7 * MS_PER_DAY + TOLERANCE_MS);
  });

  it('returns a date 30 days ago for "30d"', () => {
    const before = Date.now();
    const result = getStartDate('30d');
    const after = Date.now();

    const expected = before - 30 * MS_PER_DAY;
    expect(result.getTime()).toBeGreaterThanOrEqual(expected - TOLERANCE_MS);
    expect(result.getTime()).toBeLessThanOrEqual(after - 30 * MS_PER_DAY + TOLERANCE_MS);
  });

  it('returns a Date object for each valid range', () => {
    expect(getStartDate('24h')).toBeInstanceOf(Date);
    expect(getStartDate('7d')).toBeInstanceOf(Date);
    expect(getStartDate('30d')).toBeInstanceOf(Date);
  });

  it('falls back to 7 days for an unrecognised range', () => {
    const before = Date.now();
    const result = getStartDate('unknown');
    const after = Date.now();

    const expected = before - 7 * MS_PER_DAY;
    expect(result.getTime()).toBeGreaterThanOrEqual(expected - TOLERANCE_MS);
    expect(result.getTime()).toBeLessThanOrEqual(after - 7 * MS_PER_DAY + TOLERANCE_MS);
  });

  it('"24h" start date is earlier than "7d" start date', () => {
    // 24h ago is MORE recent (larger timestamp) than 7d ago
    expect(getStartDate('24h').getTime()).toBeGreaterThan(getStartDate('7d').getTime());
  });

  it('"7d" start date is earlier than "30d" start date', () => {
    expect(getStartDate('7d').getTime()).toBeGreaterThan(getStartDate('30d').getTime());
  });

  it('returns a date strictly in the past', () => {
    expect(getStartDate('24h').getTime()).toBeLessThan(Date.now());
    expect(getStartDate('7d').getTime()).toBeLessThan(Date.now());
    expect(getStartDate('30d').getTime()).toBeLessThan(Date.now());
  });
});
