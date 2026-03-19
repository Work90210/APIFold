import type { RequestHandler } from 'express';

import type { Logger } from '../observability/logger.js';
import { metrics } from '../observability/metrics.js';

export function createRequestLogger(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const start = performance.now();

    res.on('finish', () => {
      const durationMs = Math.round(performance.now() - start);
      const method = req.method;
      const path = req.path;
      const status = res.statusCode;

      logger.info({ method, path, status, durationMs }, 'request completed');

      metrics.incrementCounter('http_requests_total', { method, status: String(status) });
      const routePath = (req.route?.path as string | undefined) ?? 'unknown';
      metrics.observeHistogram('http_request_duration_ms', durationMs, { method, path: routePath });
    });

    next();
  };
}
