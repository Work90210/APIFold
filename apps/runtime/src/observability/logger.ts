import { createLogger as createSharedLogger } from '@apifold/logger';
import type { Logger } from '@apifold/logger';

import type { RuntimeConfig } from '../config.js';

export type { Logger };

export function createLogger(config: Pick<RuntimeConfig, 'logLevel' | 'nodeEnv'>): Logger {
  return createSharedLogger({
    name: 'apifold-runtime',
    level: config.logLevel,
    env: config.nodeEnv,
  });
}
