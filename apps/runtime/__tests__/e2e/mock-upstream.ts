import express from 'express';
import type { Server } from 'http';

export function startMockUpstream(port: number): Promise<Server> {
  const app = express();
  app.use(express.json());

  app.post('/tools/get-weather', (req, res) => {
    const body = req.body as Record<string, unknown>;
    res.json({
      temperature: 22,
      city: body.city ?? 'unknown',
      unit: 'celsius',
      source: 'mock-upstream',
    });
  });

  app.post('/tools/echo', (req, res) => {
    res.json({ echo: req.body });
  });

  return new Promise((resolve) => {
    const server = app.listen(port, () => resolve(server));
  });
}
