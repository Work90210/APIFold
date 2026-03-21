import http from 'node:http';
import { describe, it, expect, afterAll } from 'vitest';
import { createApp } from '../../src/server.js';
import { createTestLogger } from '../helpers.js';
import { metrics } from '../../src/observability/metrics.js';

describe('Cluster supporting components', () => {
  it('createApp() returns an Express app without starting a server', () => {
    const logger = createTestLogger();
    const app = createApp({
      config: {
        port: 0,
        nodeEnv: 'test',
        databaseUrl: 'postgresql://test:test@localhost:5432/test',
        databasePoolMax: 1,
        redisUrl: 'redis://localhost:6379',
        vaultSecret: 'a'.repeat(32),
        vaultSalt: 'b'.repeat(32),
        runtimeSecret: 'c'.repeat(32),
        maxSseSessions: 10,
        sseHeartbeatIntervalMs: 30_000,
        sseIdleTimeoutMs: 300_000,
        circuitBreakerThreshold: 5,
        circuitBreakerCooldownMs: 30_000,
        upstreamTimeoutMs: 30_000,
        credentialTtlMs: 300_000,
        fallbackPollIntervalMs: 30_000,
        corsOrigins: '*',
        globalRateLimitWindowMs: 900_000,
        globalRateLimitMax: 1000,
        drainTimeoutMs: 30_000,
        logLevel: 'silent',
        runtimeMaxWorkers: 2,
        runtimeShutdownGraceMs: 10_000,
        runtimeHealthPort: 0,
        maxConnectionsPerWorker: 100,
      } as never,
      logger,
      sessionManager: { hasCapacity: () => true } as never,
      protocolHandler: {} as never,
      registry: { getBySlug: () => null } as never,
      redis: null,
      isReady: () => true,
    });

    // Should be an Express app (function with properties)
    expect(typeof app).toBe('function');
    expect(typeof app.listen).toBe('function');
    expect(typeof app.use).toBe('function');
  });

  describe('Metrics gauge support', () => {
    it('setGauge and getGauge work correctly', () => {
      metrics.reset();
      metrics.setGauge('test_gauge', 42);
      expect(metrics.getGauge('test_gauge')).toBe(42);
    });

    it('incrementGauge and decrementGauge work correctly', () => {
      metrics.reset();
      metrics.incrementGauge('test_gauge');
      metrics.incrementGauge('test_gauge');
      expect(metrics.getGauge('test_gauge')).toBe(2);
      metrics.decrementGauge('test_gauge');
      expect(metrics.getGauge('test_gauge')).toBe(1);
    });

    it('gauges appear in Prometheus output', () => {
      metrics.reset();
      metrics.setGauge('active_workers', 3);
      const output = metrics.toPrometheus();
      expect(output).toContain('# TYPE active_workers gauge');
      expect(output).toContain('active_workers 3');
    });
  });

  describe('Cluster health server', () => {
    let server: http.Server;
    let port: number;

    afterAll(() => {
      if (server) server.close();
    });

    it('health endpoint returns worker count', async () => {
      metrics.reset();
      metrics.setGauge('active_workers', 2);

      server = http.createServer((req, res) => {
        if (req.url === '/health' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', workers: 2 }));
          return;
        }
        if (req.url === '/metrics' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
          res.end(metrics.toPrometheus());
          return;
        }
        res.writeHead(404);
        res.end();
      });

      await new Promise<void>((resolve) => {
        server.listen(0, () => resolve());
      });

      const addr = server.address();
      port = typeof addr === 'object' && addr ? addr.port : 0;

      // Test health endpoint
      const healthRes = await fetch(`http://127.0.0.1:${port}/health`);
      expect(healthRes.status).toBe(200);
      const body = await healthRes.json();
      expect(body).toEqual({ status: 'ok', workers: 2 });

      // Test metrics endpoint
      const metricsRes = await fetch(`http://127.0.0.1:${port}/metrics`);
      expect(metricsRes.status).toBe(200);
      const metricsBody = await metricsRes.text();
      expect(metricsBody).toContain('active_workers 2');
    });
  });
});
