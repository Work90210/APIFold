import cluster from 'node:cluster';
import http from 'node:http';
import os from 'node:os';

import { metrics } from './observability/metrics.js';

const MAX_WORKERS_CAP = 8;
const MAX_RESTARTS = 5;
const RESTART_WINDOW_MS = 60_000;
const RESTART_DELAY_MS = 1_000;

interface WorkerRestartRecord {
  timestamps: number[];
}

function getEnvInt(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function runPrimary(): void {
  const maxWorkers = Math.min(
    getEnvInt('RUNTIME_MAX_WORKERS', 4),
    MAX_WORKERS_CAP,
  );
  const graceMs = getEnvInt('RUNTIME_SHUTDOWN_GRACE_MS', 10_000);
  const healthPort = getEnvInt('RUNTIME_HEALTH_PORT', 9090);

  const restartRecords = new Map<number, WorkerRestartRecord>();
  let shuttingDown = false;

  const log = (level: string, msg: string, data?: Record<string, unknown>) => {
    const entry = {
      level,
      time: new Date().toISOString(),
      service: 'apifold-runtime',
      role: 'primary',
      msg,
      ...data,
    };
    process.stdout.write(JSON.stringify(entry) + '\n');
  };

  log('info', `Starting cluster with ${maxWorkers} workers`);

  // Fork initial workers
  for (let i = 0; i < maxWorkers; i++) {
    cluster.fork();
  }

  // Track live workers for metrics
  const updateWorkerGauge = () => {
    const count = Object.keys(cluster.workers ?? {}).length;
    metrics.setGauge('active_workers', count);
  };

  cluster.on('online', (worker) => {
    log('info', 'Worker online', { workerPid: worker.process.pid });
    updateWorkerGauge();
  });

  cluster.on('exit', (worker, code, signal) => {
    const pid = worker.process.pid ?? 0;
    log('warn', 'Worker exited', { workerPid: pid, code, signal });
    updateWorkerGauge();

    if (shuttingDown) return;

    // Track restart rate
    const now = Date.now();
    const record = restartRecords.get(pid) ?? { timestamps: [] };
    record.timestamps = record.timestamps.filter(
      (t) => now - t < RESTART_WINDOW_MS,
    );
    record.timestamps.push(now);
    restartRecords.set(pid, record);

    if (record.timestamps.length > MAX_RESTARTS) {
      log('error', 'Worker exceeded restart limit, not restarting', {
        workerPid: pid,
        restarts: record.timestamps.length,
      });
      return;
    }

    setTimeout(() => {
      if (!shuttingDown) {
        log('info', 'Restarting worker', { previousPid: pid });
        cluster.fork();
      }
    }, RESTART_DELAY_MS);
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    log('info', 'Shutdown signal received', { signal });

    // Tell all workers to shut down
    for (const id in cluster.workers) {
      const worker = cluster.workers[id];
      if (worker) {
        worker.send('shutdown');
      }
    }

    // Force exit after grace period
    setTimeout(() => {
      log('warn', 'Grace period expired, force exiting');
      process.exit(0);
    }, graceMs).unref();

    // Wait for all workers to exit naturally
    const checkAllExited = setInterval(() => {
      const remaining = Object.keys(cluster.workers ?? {}).length;
      if (remaining === 0) {
        clearInterval(checkAllExited);
        log('info', 'All workers exited, shutting down primary');
        healthServer.close();
        process.exit(0);
      }
    }, 500);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Health server on separate port
  const healthServer = http.createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      const workerCount = Object.keys(cluster.workers ?? {}).length;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', workers: workerCount }));
      return;
    }

    if (req.url === '/metrics' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
      res.end(metrics.toPrometheus());
      return;
    }

    if (req.url === '/metrics/scale-advice' && req.method === 'GET') {
      const workerCount = Object.keys(cluster.workers ?? {}).length;
      const maxConnectionsPerWorker = getEnvInt('RUNTIME_MAX_CONNECTIONS_PER_WORKER', 100);
      const connectionCapacity = workerCount * maxConnectionsPerWorker;
      const activeConnections = metrics.getGauge('active_sse_connections');
      const cpuUtilization = os.loadavg()[0]! / os.cpus().length;

      let recommendation = 'steady';
      if (activeConnections > connectionCapacity * 0.8) {
        recommendation = 'scale_up';
      } else if (activeConnections < connectionCapacity * 0.3 && workerCount > 1) {
        recommendation = 'scale_down';
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          activeConnections,
          connectionCapacity,
          cpuUtilization: Math.round(cpuUtilization * 100) / 100,
          recommendation,
          currentWorkers: workerCount,
          suggestedInstances: recommendation === 'scale_up'
            ? Math.min(workerCount + 1, MAX_WORKERS_CAP)
            : recommendation === 'scale_down'
              ? Math.max(workerCount - 1, 1)
              : workerCount,
        }),
      );
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  healthServer.listen(healthPort, () => {
    log('info', `Health server listening on port ${healthPort}`);
  });
}

async function runWorker(): Promise<void> {
  // Dynamic import to avoid loading the full app in the primary process
  const { startWorker } = await import('./index.js');
  await startWorker();
}

if (cluster.isPrimary) {
  runPrimary();
} else {
  runWorker().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Fatal worker startup error:', err);
    process.exit(1);
  });
}
