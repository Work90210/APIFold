import { describe, it, expect } from 'vitest';
import type {
  AnalyticsOverview,
  TimeSeriesPoint,
  ToolStat,
  ErrorEntry,
  FailingTool,
  RecentCall,
  UsageQuota,
  AnalyticsResponse,
  TimeRange,
} from '../../lib/hooks/use-analytics';
import { useAnalytics } from '../../lib/hooks/use-analytics';

// ---------------------------------------------------------------------------
// Helpers — build minimal valid objects for each type
// ---------------------------------------------------------------------------

const overview: AnalyticsOverview = {
  totalCalls: 100,
  successCount: 95,
  errorCount: 5,
  successRate: 95.0,
  avgLatencyMs: 120,
  p50Ms: 100,
  p95Ms: 300,
  p99Ms: 500,
};

const timeSeriesPoint: TimeSeriesPoint = {
  bucket: '2026-03-15T00:00:00.000Z',
  calls: 42,
  errors: 2,
};

const toolStat: ToolStat = {
  name: 'list_files',
  calls: 50,
  avgMs: 80,
};

const errorEntry: ErrorEntry = {
  statusCode: 404,
  errorCode: 'NOT_FOUND',
  count: 3,
};

const errorEntryNullCode: ErrorEntry = {
  statusCode: 500,
  errorCode: null,
  count: 1,
};

const failingTool: FailingTool = {
  name: 'delete_file',
  total: 20,
  errors: 5,
  errorRate: 25.0,
};

const recentCall: RecentCall = {
  tool: 'read_file',
  status: 200,
  durationMs: 95,
  timestamp: '2026-03-22T10:00:00.000Z',
};

const usageQuota: UsageQuota = {
  monthlyCallsUsed: 500,
  monthlyCallsLimit: 1000,
  planName: 'pro',
};

const usageQuotaUnlimited: UsageQuota = {
  monthlyCallsUsed: 100,
  monthlyCallsLimit: null,
  planName: 'enterprise',
};

const fullResponse: AnalyticsResponse = {
  range: '7d',
  overview,
  timeSeries: [timeSeriesPoint],
  topTools: [toolStat],
  errorBreakdown: [errorEntry, errorEntryNullCode],
  failingTools: [failingTool],
  recentActivity: [recentCall],
  usage: usageQuota,
};

// ---------------------------------------------------------------------------
// AnalyticsOverview
// ---------------------------------------------------------------------------

describe('AnalyticsOverview', () => {
  it('has totalCalls as a number', () => {
    expect(typeof overview.totalCalls).toBe('number');
  });

  it('has successCount as a number', () => {
    expect(typeof overview.successCount).toBe('number');
  });

  it('has errorCount as a number', () => {
    expect(typeof overview.errorCount).toBe('number');
  });

  it('has successRate as a number', () => {
    expect(typeof overview.successRate).toBe('number');
  });

  it('has avgLatencyMs as a number', () => {
    expect(typeof overview.avgLatencyMs).toBe('number');
  });

  it('has p50Ms as a number', () => {
    expect(typeof overview.p50Ms).toBe('number');
  });

  it('has p95Ms as a number', () => {
    expect(typeof overview.p95Ms).toBe('number');
  });

  it('has p99Ms as a number', () => {
    expect(typeof overview.p99Ms).toBe('number');
  });

  it('has all 8 required fields', () => {
    const keys = Object.keys(overview);
    expect(keys).toContain('totalCalls');
    expect(keys).toContain('successCount');
    expect(keys).toContain('errorCount');
    expect(keys).toContain('successRate');
    expect(keys).toContain('avgLatencyMs');
    expect(keys).toContain('p50Ms');
    expect(keys).toContain('p95Ms');
    expect(keys).toContain('p99Ms');
  });
});

// ---------------------------------------------------------------------------
// TimeSeriesPoint
// ---------------------------------------------------------------------------

describe('TimeSeriesPoint', () => {
  it('has bucket as a string', () => {
    expect(typeof timeSeriesPoint.bucket).toBe('string');
  });

  it('has calls as a number', () => {
    expect(typeof timeSeriesPoint.calls).toBe('number');
  });

  it('has errors as a number', () => {
    expect(typeof timeSeriesPoint.errors).toBe('number');
  });

  it('has exactly 3 fields', () => {
    const keys = Object.keys(timeSeriesPoint);
    expect(keys).toHaveLength(3);
    expect(keys).toContain('bucket');
    expect(keys).toContain('calls');
    expect(keys).toContain('errors');
  });
});

// ---------------------------------------------------------------------------
// ToolStat
// ---------------------------------------------------------------------------

describe('ToolStat', () => {
  it('has name as a string', () => {
    expect(typeof toolStat.name).toBe('string');
  });

  it('has calls as a number', () => {
    expect(typeof toolStat.calls).toBe('number');
  });

  it('has avgMs as a number', () => {
    expect(typeof toolStat.avgMs).toBe('number');
  });

  it('has exactly 3 fields', () => {
    const keys = Object.keys(toolStat);
    expect(keys).toHaveLength(3);
    expect(keys).toContain('name');
    expect(keys).toContain('calls');
    expect(keys).toContain('avgMs');
  });
});

// ---------------------------------------------------------------------------
// ErrorEntry
// ---------------------------------------------------------------------------

describe('ErrorEntry', () => {
  it('has statusCode as a number', () => {
    expect(typeof errorEntry.statusCode).toBe('number');
  });

  it('has errorCode as a string when present', () => {
    expect(typeof errorEntry.errorCode).toBe('string');
  });

  it('allows errorCode to be null', () => {
    expect(errorEntryNullCode.errorCode).toBeNull();
  });

  it('has count as a number', () => {
    expect(typeof errorEntry.count).toBe('number');
  });

  it('has exactly 3 fields', () => {
    const keys = Object.keys(errorEntry);
    expect(keys).toHaveLength(3);
    expect(keys).toContain('statusCode');
    expect(keys).toContain('errorCode');
    expect(keys).toContain('count');
  });
});

// ---------------------------------------------------------------------------
// FailingTool
// ---------------------------------------------------------------------------

describe('FailingTool', () => {
  it('has name as a string', () => {
    expect(typeof failingTool.name).toBe('string');
  });

  it('has total as a number', () => {
    expect(typeof failingTool.total).toBe('number');
  });

  it('has errors as a number', () => {
    expect(typeof failingTool.errors).toBe('number');
  });

  it('has errorRate as a number', () => {
    expect(typeof failingTool.errorRate).toBe('number');
  });

  it('has exactly 4 fields', () => {
    const keys = Object.keys(failingTool);
    expect(keys).toHaveLength(4);
    expect(keys).toContain('name');
    expect(keys).toContain('total');
    expect(keys).toContain('errors');
    expect(keys).toContain('errorRate');
  });
});

// ---------------------------------------------------------------------------
// RecentCall
// ---------------------------------------------------------------------------

describe('RecentCall', () => {
  it('has tool as a string', () => {
    expect(typeof recentCall.tool).toBe('string');
  });

  it('has status as a number', () => {
    expect(typeof recentCall.status).toBe('number');
  });

  it('has durationMs as a number', () => {
    expect(typeof recentCall.durationMs).toBe('number');
  });

  it('has timestamp as a string', () => {
    expect(typeof recentCall.timestamp).toBe('string');
  });

  it('has exactly 4 fields', () => {
    const keys = Object.keys(recentCall);
    expect(keys).toHaveLength(4);
    expect(keys).toContain('tool');
    expect(keys).toContain('status');
    expect(keys).toContain('durationMs');
    expect(keys).toContain('timestamp');
  });
});

// ---------------------------------------------------------------------------
// UsageQuota
// ---------------------------------------------------------------------------

describe('UsageQuota', () => {
  it('has monthlyCallsUsed as a number', () => {
    expect(typeof usageQuota.monthlyCallsUsed).toBe('number');
  });

  it('has monthlyCallsLimit as a number when set', () => {
    expect(typeof usageQuota.monthlyCallsLimit).toBe('number');
  });

  it('allows monthlyCallsLimit to be null for unlimited plans', () => {
    expect(usageQuotaUnlimited.monthlyCallsLimit).toBeNull();
  });

  it('has planName as a string', () => {
    expect(typeof usageQuota.planName).toBe('string');
  });

  it('has exactly 3 fields', () => {
    const keys = Object.keys(usageQuota);
    expect(keys).toHaveLength(3);
    expect(keys).toContain('monthlyCallsUsed');
    expect(keys).toContain('monthlyCallsLimit');
    expect(keys).toContain('planName');
  });
});

// ---------------------------------------------------------------------------
// AnalyticsResponse
// ---------------------------------------------------------------------------

describe('AnalyticsResponse', () => {
  it('has range as a string', () => {
    expect(typeof fullResponse.range).toBe('string');
  });

  it('has an overview section', () => {
    expect(fullResponse.overview).toBeDefined();
    expect(typeof fullResponse.overview).toBe('object');
  });

  it('has timeSeries as an array', () => {
    expect(Array.isArray(fullResponse.timeSeries)).toBe(true);
  });

  it('has topTools as an array', () => {
    expect(Array.isArray(fullResponse.topTools)).toBe(true);
  });

  it('has errorBreakdown as an array', () => {
    expect(Array.isArray(fullResponse.errorBreakdown)).toBe(true);
  });

  it('has failingTools as an array', () => {
    expect(Array.isArray(fullResponse.failingTools)).toBe(true);
  });

  it('has recentActivity as an array', () => {
    expect(Array.isArray(fullResponse.recentActivity)).toBe(true);
  });

  it('has a usage section', () => {
    expect(fullResponse.usage).toBeDefined();
    expect(typeof fullResponse.usage).toBe('object');
  });

  it('has all 8 top-level fields', () => {
    const keys = Object.keys(fullResponse);
    expect(keys).toContain('range');
    expect(keys).toContain('overview');
    expect(keys).toContain('timeSeries');
    expect(keys).toContain('topTools');
    expect(keys).toContain('errorBreakdown');
    expect(keys).toContain('failingTools');
    expect(keys).toContain('recentActivity');
    expect(keys).toContain('usage');
  });

  it('satisfies the full shape with nested values intact', () => {
    expect(fullResponse.overview.totalCalls).toBe(100);
    expect(fullResponse.overview.successRate).toBe(95.0);
    expect(fullResponse.timeSeries[0].bucket).toBe('2026-03-15T00:00:00.000Z');
    expect(fullResponse.topTools[0].name).toBe('list_files');
    expect(fullResponse.errorBreakdown[0].statusCode).toBe(404);
    expect(fullResponse.errorBreakdown[1].errorCode).toBeNull();
    expect(fullResponse.failingTools[0].errorRate).toBe(25.0);
    expect(fullResponse.recentActivity[0].tool).toBe('read_file');
    expect(fullResponse.usage.planName).toBe('pro');
  });
});

// ---------------------------------------------------------------------------
// TimeRange
// ---------------------------------------------------------------------------

describe('TimeRange', () => {
  it('accepts "24h"', () => {
    const range: TimeRange = '24h';
    expect(range).toBe('24h');
  });

  it('accepts "7d"', () => {
    const range: TimeRange = '7d';
    expect(range).toBe('7d');
  });

  it('accepts "30d"', () => {
    const range: TimeRange = '30d';
    expect(range).toBe('30d');
  });

  it('covers all three accepted values', () => {
    const validRanges: TimeRange[] = ['24h', '7d', '30d'];
    expect(validRanges).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// useAnalytics export
// ---------------------------------------------------------------------------

describe('useAnalytics', () => {
  it('is exported as a function', () => {
    expect(typeof useAnalytics).toBe('function');
  });
});
