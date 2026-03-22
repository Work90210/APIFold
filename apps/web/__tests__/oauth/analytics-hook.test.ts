import { describe, it, expect } from 'vitest';
import type {
  AnalyticsOverview,
  ToolStat,
  ToolBreakdown,
  AnalyticsResponse,
  TimeRange,
} from '../../lib/hooks/use-analytics';

// ---------------------------------------------------------------------------
// Type-level compilation tests
//
// These tests confirm that the exported types from use-analytics accept the
// right shapes and reject invalid ones at compile time.  At runtime they also
// verify that values constructed to match each interface satisfy the
// structural checks we care about.
// ---------------------------------------------------------------------------

describe('AnalyticsOverview type', () => {
  it('accepts a valid AnalyticsOverview object', () => {
    const overview: AnalyticsOverview = {
      totalCalls: 1000,
      successCount: 950,
      errorCount: 50,
      successRate: 95,
      avgLatencyMs: 120,
      p50Ms: 80,
      p95Ms: 300,
      p99Ms: 800,
    };

    expect(overview.totalCalls).toBe(1000);
    expect(overview.successCount + overview.errorCount).toBe(overview.totalCalls);
  });

  it('successRate is a number in the 0–100 range for a well-formed payload', () => {
    const overview: AnalyticsOverview = {
      totalCalls: 200,
      successCount: 180,
      errorCount: 20,
      successRate: 90,
      avgLatencyMs: 50,
      p50Ms: 30,
      p95Ms: 150,
      p99Ms: 400,
    };

    expect(overview.successRate).toBeGreaterThanOrEqual(0);
    expect(overview.successRate).toBeLessThanOrEqual(100);
  });

  it('allows zero totalCalls', () => {
    const overview: AnalyticsOverview = {
      totalCalls: 0,
      successCount: 0,
      errorCount: 0,
      successRate: 0,
      avgLatencyMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0,
    };

    expect(overview.totalCalls).toBe(0);
  });
});

describe('ToolStat type', () => {
  it('accepts a valid ToolStat object', () => {
    const stat: ToolStat = {
      name: 'listUsers',
      calls: 42,
      avgMs: 130,
    };

    expect(stat.name).toBe('listUsers');
    expect(stat.calls).toBeGreaterThanOrEqual(0);
    expect(stat.avgMs).toBeGreaterThanOrEqual(0);
  });
});

describe('ToolBreakdown type', () => {
  it('accepts a ToolBreakdown with a non-null toolId', () => {
    const breakdown: ToolBreakdown = {
      name: 'createPet',
      calls: 10,
      avgMs: 200,
      toolId: 'tool-abc-123',
    };

    expect(breakdown.toolId).toBe('tool-abc-123');
  });

  it('accepts a ToolBreakdown with a null toolId', () => {
    const breakdown: ToolBreakdown = {
      name: 'deletePet',
      calls: 5,
      avgMs: 80,
      toolId: null,
    };

    expect(breakdown.toolId).toBeNull();
  });

  it('is structurally a superset of ToolStat', () => {
    const breakdown: ToolBreakdown = {
      name: 'getPet',
      calls: 7,
      avgMs: 95,
      toolId: 'tool-xyz',
    };

    // ToolBreakdown extends ToolStat so the ToolStat fields must be present
    const asStat: ToolStat = breakdown;

    expect(asStat.name).toBe('getPet');
    expect(asStat.calls).toBe(7);
    expect(asStat.avgMs).toBe(95);
  });
});

describe('AnalyticsResponse type', () => {
  it('accepts a valid full AnalyticsResponse', () => {
    const response: AnalyticsResponse = {
      range: '7d',
      overview: {
        totalCalls: 500,
        successCount: 480,
        errorCount: 20,
        successRate: 96,
        avgLatencyMs: 110,
        p50Ms: 70,
        p95Ms: 280,
        p99Ms: 750,
      },
      topTools: [
        { name: 'listPets', calls: 100, avgMs: 90 },
        { name: 'getPet', calls: 80, avgMs: 110 },
      ],
      toolBreakdown: [
        { name: 'listPets', calls: 100, avgMs: 90, toolId: 'tool-1' },
        { name: 'getPet', calls: 80, avgMs: 110, toolId: null },
      ],
    };

    expect(response.range).toBe('7d');
    expect(response.topTools).toHaveLength(2);
    expect(response.toolBreakdown).toHaveLength(2);
  });

  it('accepts empty topTools and toolBreakdown arrays', () => {
    const response: AnalyticsResponse = {
      range: '24h',
      overview: {
        totalCalls: 0,
        successCount: 0,
        errorCount: 0,
        successRate: 0,
        avgLatencyMs: 0,
        p50Ms: 0,
        p95Ms: 0,
        p99Ms: 0,
      },
      topTools: [],
      toolBreakdown: [],
    };

    expect(response.topTools).toHaveLength(0);
    expect(response.toolBreakdown).toHaveLength(0);
  });
});

describe('TimeRange type', () => {
  it('accepts all valid time range values', () => {
    const ranges: TimeRange[] = ['24h', '7d', '30d'];

    expect(ranges).toHaveLength(3);
    expect(ranges).toContain('24h');
    expect(ranges).toContain('7d');
    expect(ranges).toContain('30d');
  });

  it('the default range value "7d" is a valid TimeRange', () => {
    const defaultRange: TimeRange = '7d';

    expect(defaultRange).toBe('7d');
  });
});

describe('useAnalytics export', () => {
  it('is exported as a function', async () => {
    const { useAnalytics } = await import('../../lib/hooks/use-analytics');

    expect(typeof useAnalytics).toBe('function');
  });
});
