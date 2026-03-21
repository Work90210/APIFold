# Self-Hosting Guide

This guide covers deploying APIFold with external managed services instead of the bundled Docker containers.

## Database Setup

### Local Docker (Development)

The default `docker-compose.yml` includes a Postgres 16 container. No additional configuration needed.

### Managed Postgres Providers

#### Neon

```env
DATABASE_URL=postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/apifold?sslmode=require
DATABASE_POOL_MAX=5
```

Neon uses connection pooling by default. Keep `DATABASE_POOL_MAX` low (5-10) to avoid exceeding connection limits.

#### Supabase

```env
DATABASE_URL=postgresql://postgres.xyz:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres
DATABASE_POOL_MAX=10
```

Use the **pooler** connection string (port 6543) for transaction-mode pooling. The `prepare: false` setting is already configured for PgBouncer compatibility.

#### AWS RDS

```env
DATABASE_URL=postgresql://mt:pass@mydb.cluster-xyz.us-east-1.rds.amazonaws.com:5432/apifold?sslmode=require
DATABASE_POOL_MAX=20
```

RDS supports higher connection limits. A pool size of 20 is appropriate for most workloads.

### SSL Configuration

SSL is auto-detected from `sslmode=require` in the connection URL. You can also force it:

```env
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
```

Set `DATABASE_SSL_REJECT_UNAUTHORIZED=false` only for self-signed certificates in development.

### Running Migrations

```bash
DATABASE_URL=postgresql://... pnpm db:migrate
```

### Verifying Connectivity

```bash
DATABASE_URL=postgresql://... pnpm db:check
```

### Backup and Recovery

Defer to your provider's documentation:

- **Neon**: Automatic branching and point-in-time restore
- **Supabase**: Daily backups, point-in-time recovery on Pro plan
- **AWS RDS**: Automated backups, snapshots, cross-region read replicas

## Redis Setup

### Local Docker (Development)

The default `docker-compose.yml` includes a Redis 7 container.

### Managed Redis Providers

#### Upstash

```env
REDIS_URL=rediss://default:token@us1-xyz.upstash.io:6379
```

TLS is auto-detected from the `rediss://` URL scheme. Upstash Global provides multi-region read replicas.

#### AWS ElastiCache

```env
REDIS_URL=redis://my-cluster.xyz.use1.cache.amazonaws.com:6379
REDIS_TLS=true
```

#### Redis Cloud

```env
REDIS_URL=redis://default:pass@redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345
REDIS_TLS=true
```

### TLS Configuration

TLS is auto-detected from `rediss://` URLs. Force it with:

```env
REDIS_TLS=true
```

## Managed Services Deployment

Use `docker-compose.managed.yml` when running with external Postgres and Redis:

```bash
cd infra
docker compose -f docker-compose.managed.yml up -d
```

This file omits the postgres and redis containers and their volumes.

## Monitoring

Enable the optional Prometheus monitoring stack:

```bash
docker compose --profile monitoring up -d
```

This starts a Prometheus instance that scrapes the runtime's `/metrics` endpoint on port 9090.

Access Prometheus at `http://localhost:9091`.

### Available Metrics

- `active_sse_connections` — Current number of SSE connections
- `active_workers` — Number of active cluster worker processes
- `http_requests_total` — Total HTTP requests by method and status
- `http_request_duration_ms` — Request duration histogram
- `total_tool_calls` — Total MCP tool invocations
- `tool_call_errors` — Failed tool invocations
- `tool_call_duration_ms` — Tool execution duration histogram
