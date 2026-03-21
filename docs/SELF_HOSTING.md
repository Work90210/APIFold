# Self-Hosting ApiFold

Deploy ApiFold on your own infrastructure with Docker Compose.

> For the full self-hosting guide with detailed configuration reference, TLS setup, and troubleshooting, see the [documentation site](https://apifold.com/docs/self-hosting).

## Prerequisites

- Docker v24.0+
- Docker Compose v2.0+
- Minimum 2 vCPU, 4GB RAM
- Domain name (optional, required for SSL)

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/apifold/apifold.git
cd apifold

# 2. Configure environment variables
cp .env.example .env
# Edit .env — at minimum set: POSTGRES_PASSWORD, REDIS_PASSWORD,
# VAULT_SECRET, VAULT_SALT, MCP_RUNTIME_SECRET
# Generate secrets with: openssl rand -base64 48

# 3. Start the stack
docker compose -f infra/docker-compose.yml up -d
```

Your instance will be available at `http://localhost` (port 80 via nginx).

## Architecture

The Docker Compose stack runs 5 services:

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| **web** | `apifold-web` | 3000 | Next.js dashboard |
| **runtime** | `apifold-runtime` | 3001 | MCP SSE runtime |
| **postgres** | `postgres:16-alpine` | 5432 | Database |
| **redis** | `redis:7-alpine` | 6379 | Pub/sub and caching |
| **nginx** | `nginx:alpine` | 80/443 | Reverse proxy + TLS |

## Health Checks

All services include health checks:

- **Web:** `GET /api/health`
- **Runtime:** `GET /health`, `GET /health/live`, `GET /health/ready`
- **Postgres:** `pg_isready`
- **Redis:** `redis-cli ping`

## Backup & Restore

```bash
# Backup database
docker exec -t apifold-postgres pg_dump -U mt apifold > backup.sql

# Restore database
cat backup.sql | docker exec -i apifold-postgres psql -U mt apifold
```

**Important:** Also back up your `.env` file. Without `VAULT_SECRET` and `VAULT_SALT`, encrypted credentials cannot be recovered.

## Upgrading

```bash
docker compose -f infra/docker-compose.yml pull
docker compose -f infra/docker-compose.yml up -d
```

Migrations run automatically on startup.

## More Information

See the [full self-hosting guide](https://apifold.com/docs/self-hosting) for:

- Complete environment variable reference
- TLS/SSL setup with Certbot
- Auto-deploy with Watchtower
- Monitoring and observability
- Troubleshooting guide
