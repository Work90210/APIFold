# Architecture Decision Records

## ADR-001: Monorepo with Turborepo

**Status**: Accepted

**Context**: Model Translator consists of multiple packages (transformer library, web app, runtime server, shared types, UI components). We need a strategy for managing these interconnected packages.

**Decision**: Use a pnpm workspace monorepo with Turborepo for build orchestration.

**Consequences**:
- Single repository for all packages
- Shared dependencies and configuration
- Turborepo provides caching and parallel builds
- pnpm workspaces for dependency management

## ADR-002: Dual Licensing (AGPL-3 + MIT)

**Status**: Accepted

**Context**: The transformer library should be freely usable by anyone, while the hosted platform should remain open-source with copyleft protection.

**Decision**: License `@model-translator/transformer` under MIT, everything else under AGPL-3.0-or-later.

**Consequences**:
- Transformer library can be used in any project
- Platform code changes must be shared back
- Clear separation between library and platform

## ADR-003: Express for Runtime Server

**Status**: Accepted

**Context**: The MCP runtime server needs SSE support and a lightweight HTTP framework.

**Decision**: Use Express.js for the runtime server.

**Consequences**:
- Mature, well-documented framework
- Native SSE support
- Large ecosystem of middleware
