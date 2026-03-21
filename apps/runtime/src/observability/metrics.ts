/** Simple in-memory metrics for Prometheus-compatible /metrics endpoint. */

interface CounterEntry {
  readonly labels: Readonly<Record<string, string>>;
  value: number;
}

interface HistogramEntry {
  readonly labels: Readonly<Record<string, string>>;
  sum: number;
  count: number;
  buckets: readonly number[];
  bucketCounts: number[];
}

const DEFAULT_BUCKETS = Object.freeze([5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]);

class MetricsRegistry {
  private readonly counters = new Map<string, CounterEntry[]>();
  private readonly histograms = new Map<string, HistogramEntry[]>();
  private readonly gauges = new Map<string, number>();

  setGauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  incrementGauge(name: string, amount = 1): void {
    this.gauges.set(name, (this.gauges.get(name) ?? 0) + amount);
  }

  decrementGauge(name: string, amount = 1): void {
    this.gauges.set(name, (this.gauges.get(name) ?? 0) - amount);
  }

  getGauge(name: string): number {
    return this.gauges.get(name) ?? 0;
  }

  incrementCounter(name: string, labels: Readonly<Record<string, string>> = {}, amount = 1): void {
    const entries = this.counters.get(name) ?? [];
    const existing = entries.find((e) => labelsMatch(e.labels, labels));
    if (existing) {
      existing.value += amount;
    } else {
      entries.push({ labels, value: amount });
      this.counters.set(name, entries);
    }
  }

  observeHistogram(
    name: string,
    value: number,
    labels: Readonly<Record<string, string>> = {},
  ): void {
    const entries = this.histograms.get(name) ?? [];
    const existing = entries.find((e) => labelsMatch(e.labels, labels));
    if (existing) {
      existing.sum += value;
      existing.count += 1;
      for (let i = 0; i < existing.buckets.length; i++) {
        if (value <= existing.buckets[i]!) {
          existing.bucketCounts[i]! += 1;
        }
      }
    } else {
      const bucketCounts = DEFAULT_BUCKETS.map((b) => (value <= b ? 1 : 0));
      entries.push({
        labels,
        sum: value,
        count: 1,
        buckets: DEFAULT_BUCKETS,
        bucketCounts,
      });
      this.histograms.set(name, entries);
    }
  }

  toPrometheus(): string {
    const lines: string[] = [];

    for (const [name, value] of this.gauges) {
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name} ${value}`);
    }

    for (const [name, entries] of this.counters) {
      lines.push(`# TYPE ${name} counter`);
      for (const entry of entries) {
        lines.push(`${name}${formatLabels(entry.labels)} ${entry.value}`);
      }
    }

    for (const [name, entries] of this.histograms) {
      lines.push(`# TYPE ${name} histogram`);
      for (const entry of entries) {
        const lblStr = formatLabels(entry.labels);
        for (let i = 0; i < entry.buckets.length; i++) {
          lines.push(`${name}_bucket{le="${entry.buckets[i]}"${lblStr ? ',' + lblStr.slice(1, -1) : ''}} ${entry.bucketCounts[i]}`);
        }
        lines.push(`${name}_bucket{le="+Inf"${lblStr ? ',' + lblStr.slice(1, -1) : ''}} ${entry.count}`);
        lines.push(`${name}_sum${lblStr} ${entry.sum}`);
        lines.push(`${name}_count${lblStr} ${entry.count}`);
      }
    }

    return lines.join('\n') + '\n';
  }

  reset(): void {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }
}

function labelsMatch(
  a: Readonly<Record<string, string>>,
  b: Readonly<Record<string, string>>,
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => a[k] === b[k]);
}

function sanitizeLabelValue(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function formatLabels(labels: Readonly<Record<string, string>>): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) return '';
  return `{${entries.map(([k, v]) => `${k}="${sanitizeLabelValue(v)}"`).join(',')}}`;
}

export const metrics = new MetricsRegistry();
export type { MetricsRegistry };
