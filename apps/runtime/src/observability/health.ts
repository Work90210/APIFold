import { Router } from 'express';

import type { Logger } from './logger.js';

export interface HealthDependencies {
  readonly isReady: () => boolean;
  readonly logger: Logger;
}

export function createHealthRouter(deps: HealthDependencies): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  router.get('/health/live', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/health/ready', (_req, res) => {
    if (deps.isReady()) {
      res.json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not_ready' });
    }
  });

  return router;
}
