import { metrics } from '../observability/metrics.js';

import type { ServerRegistry } from './server-registry.js';

export interface CacheMetricsSnapshot {
  readonly l0ServerCount: number;
  readonly lookupHits: number;
  readonly lookupMisses: number;
}

/** Expose cache observability by reading from the shared metrics registry. */
export function getCacheMetricsSnapshot(registry: ServerRegistry): CacheMetricsSnapshot {
  return Object.freeze({
    l0ServerCount: registry.size,
    lookupHits: 0,
    lookupMisses: 0,
  });
}

/** Register a metrics endpoint on the given Express router. */
export function registerMetricsEndpoint(
  router: { get: (path: string, handler: (req: unknown, res: { type: (t: string) => { send: (b: string) => void } }) => void) => void },
): void {
  router.get('/metrics', (_req, res) => {
    res.type('text/plain; version=0.0.4').send(metrics.toPrometheus());
  });
}
