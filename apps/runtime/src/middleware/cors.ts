import cors from 'cors';
import type { RequestHandler } from 'express';

import type { RuntimeConfig } from '../config.js';

export function createCorsMiddleware(config: Pick<RuntimeConfig, 'corsOrigins'>): RequestHandler {
  const origins = config.corsOrigins === '*' ? '*' : config.corsOrigins.split(',').map((o) => o.trim());

  return cors({
    origin: origins,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Runtime-Secret', 'X-Session-ID', 'Mcp-Session-Id'],
    exposedHeaders: ['Mcp-Session-Id'],
    credentials: config.corsOrigins !== '*',
    maxAge: 86400,
  });
}
