# Deploying to Fly.io

This guide covers deploying APIFold's web dashboard and MCP runtime to Fly.io.

## Prerequisites

Install the Fly CLI:
```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

## Create Apps

```bash
fly apps create apifold-runtime
fly apps create apifold-web
```

## Set Secrets

```bash
# Runtime secrets
fly secrets set \
  DATABASE_URL="postgresql://..." \
  REDIS_URL="rediss://..." \
  VAULT_SECRET="your-vault-secret" \
  VAULT_SALT="your-vault-salt" \
  MCP_RUNTIME_SECRET="your-runtime-secret" \
  --app apifold-runtime

# Web secrets
fly secrets set \
  DATABASE_URL="postgresql://..." \
  REDIS_URL="rediss://..." \
  VAULT_SECRET="your-vault-secret" \
  VAULT_SALT="your-vault-salt" \
  RUNTIME_PUBLIC_URL="https://apifold-runtime.fly.dev" \
  --app apifold-web
```

## Deploy

```bash
# Deploy runtime
fly deploy --config infra/fly/fly.runtime.toml --remote-only

# Deploy web
fly deploy --config infra/fly/fly.web.toml --remote-only
```

## Scaling

```bash
# Scale runtime to 3 instances
fly scale count 3 --app apifold-runtime

# Scale in specific regions
fly scale count 2 --region ams --app apifold-runtime
fly scale count 2 --region iad --app apifold-runtime
fly scale count 1 --region nrt --app apifold-runtime
```

## Auto-Scaling

Fly.io auto-starts and auto-stops machines based on traffic (configured in `fly.runtime.toml`):
- `auto_start_machines = true` — starts machines when requests arrive
- `auto_stop_machines = true` — stops idle machines after timeout
- `min_machines_running = 1` — always keep at least 1 machine running

For manual autoscale boundaries:
```bash
fly autoscale set min=1 max=10 --app apifold-runtime
```

## Monitoring

```bash
# View logs
fly logs --app apifold-runtime

# Check status
fly status --app apifold-runtime

# SSH into a machine
fly ssh console --app apifold-runtime
```

## Health Checks

The runtime exposes health on port 9090:
- `GET /health` — cluster status and worker count
- `GET /metrics` — Prometheus metrics

Fly.io automatically monitors the health endpoint and restarts unhealthy machines.

## Database Recommendations

Use a managed Postgres provider accessible from Fly.io regions:
- **Neon** — serverless, auto-scaling, good for variable traffic
- **Supabase** — full Postgres with extras, good regional options
- **Fly Postgres** — managed Postgres on Fly infrastructure

For Redis, use **Upstash** with Global Redis for multi-region read replicas.

## CI/CD

A GitHub Actions workflow is provided at `.github/workflows/deploy.yml` for manual deployments. Set the `FLY_API_TOKEN` secret in your repository settings:

```bash
fly tokens create deploy --app apifold-runtime
```
