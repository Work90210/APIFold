import pino from 'pino';

import type { RuntimeConfig } from '../config.js';

export type Logger = pino.Logger;

export function createLogger(config: Pick<RuntimeConfig, 'logLevel' | 'nodeEnv'>): Logger {
  return pino({
    level: config.logLevel,
    transport:
      config.nodeEnv === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
    base: { service: 'apifold-runtime' },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}
