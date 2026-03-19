# Contributing to APIFold

Thank you for your interest in contributing to APIFold!

## Development Setup

### Prerequisites

- Node.js 20+ (see `.nvmrc`)
- pnpm 9+
- Docker & Docker Compose (for local services)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/your-org/apifold.git
cd apifold

# Install dependencies
pnpm install

# Start local services (Postgres + Redis)
docker compose -f infra/docker-compose.dev.yml up -d

# Copy environment variables
cp .env.example .env

# Run database migrations
pnpm db:migrate

# Seed development data
pnpm db:seed

# Start development servers
pnpm dev
```

### Available Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services in development mode |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type-check all packages |
| `pnpm format` | Format all files with Prettier |
| `pnpm db:studio` | Open Drizzle Studio |

### Project Structure

- `apps/web` — Next.js web application
- `apps/runtime` — Express MCP SSE server
- `packages/transformer` — Core transformation library (MIT)
- `packages/types` — Shared TypeScript types
- `packages/ui` — Design system and components
- `packages/eslint-config` — Shared ESLint configuration
- `packages/tsconfig` — Shared TypeScript configurations

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes
4. Run `pnpm lint && pnpm typecheck && pnpm test`
5. Commit using conventional commits (`feat:`, `fix:`, `docs:`, etc.)
6. Open a pull request

## Code Style

- TypeScript strict mode
- ESLint + Prettier for formatting
- Conventional commits for commit messages

## Licensing

- The `@apifold/transformer` package is licensed under MIT
- All other code is licensed under AGPL-3.0-or-later

By contributing, you agree that your contributions will be licensed under the respective licenses.
