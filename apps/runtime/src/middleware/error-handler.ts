import type { ErrorRequestHandler } from 'express';

import type { Logger } from '../observability/logger.js';

// Messages explicitly thrown by our middleware/handlers are safe to surface.
// Anything else might contain file paths, DB details, or stack fragments.
const SAFE_4XX_MESSAGES = new Set([
  'Server not found',
  'Session not found',
  'Session does not belong to this server',
  'Invalid JSON-RPC request',
  'Missing X-Session-ID header',
  'Invalid server slug',
  'Worker at connection capacity',
  'Too many active sessions',
  'Rate limit exceeded',
  'Missing or invalid Authorization header',
  'Invalid API key',
  'Missing service secret',
  'Invalid service secret',
  'Session does not belong to this client',
]);

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (err: unknown, _req, res, _next) => {
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = isHttpError(err) ? err.status : 500;

    if (status >= 500) {
      logger.error({ err }, 'Unhandled server error');
    } else {
      logger.warn({ err, status }, 'Client error');
    }

    if (!res.headersSent) {
      let safeMessage: string;
      if (status >= 500) {
        safeMessage = 'Internal server error';
      } else if (SAFE_4XX_MESSAGES.has(message)) {
        safeMessage = message;
      } else {
        safeMessage = 'Bad request';
      }

      res.status(status).json({ error: safeMessage });
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
