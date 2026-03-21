import pino from 'pino';

export type Logger = pino.Logger;

export interface CreateLoggerOptions {
  name?: string;
  level?: string;
  env?: string;
}

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const level = options.level ?? process.env['LOG_LEVEL'] ?? 'info';
  const env = options.env ?? process.env['NODE_ENV'] ?? 'development';
  const name = options.name ?? 'apifold';

  return pino({
    level,
    transport:
      env === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers["x-api-key"]',
        'req.headers["x-runtime-secret"]',
        'req.headers.cookie',
        'password',
        'secret',
        'token',
        'creditCard',
      ],
      censor: '[REDACTED]',
    },
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
    base: { service: name },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}
