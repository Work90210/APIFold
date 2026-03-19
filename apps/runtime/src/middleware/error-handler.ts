import type { ErrorRequestHandler } from 'express';

import type { Logger } from '../observability/logger.js';

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (err: unknown, _req, res, _next) => {
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = isHttpError(err) ? err.status : 500;

    if (status >= 500) {
      logger.error({ err }, 'Unhandled server error');
    }

    if (!res.headersSent) {
      res.status(status).json({
        error: status >= 500 ? 'Internal server error' : message,
      });
    }
  };
}

function isHttpError(err: unknown): err is { status: number; message: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as Record<string, unknown>)['status'] === 'number'
  );
}
