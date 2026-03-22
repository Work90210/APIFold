# Architecture Decision Records

## ADR-001: Monorepo with Turborepo

**Status**: Accepted

**Context**: APIFold consists of multiple packages (transformer library, web app, runtime server, shared types, UI components). We need a strategy for managing these interconnected packages.

**Decision**: Use a pnpm workspace monorepo with Turborepo for build orchestration.

**Consequences**:
- Single repository for all packages
- Shared dependencies and configuration
- Turborepo provides caching and parallel builds
- pnpm workspaces for dependency management

## ADR-002: Dual Licensing (AGPL-3 + MIT)

**Status**: Accepted

**Context**: The transformer library should be freely usable by anyone, while the hosted platform should remain open-source with copyleft protection.

**Decision**: License `@apifold/transformer` under MIT, everything else under AGPL-3.0-or-later.

**Consequences**:
- Transformer library can be used in any project
- Platform code changes must be shared back
- Clear separation between library and platform

## ADR-003: Transformer as Pure Functions

**Status**: Accepted

**Context**: The transformer package converts OpenAPI specs into MCP tool definitions. This is the intellectual core of the project and needs to be maximally reusable, testable, and predictable.

**Decision**: Implement the transformer as pure functions only — no side effects, no network calls, no filesystem access, no mutable state.

**Rationale**:
- Pure functions are trivially testable (input in, output out)
- No hidden dependencies make the library predictable across environments
- Enables safe concurrent usage without locks or synchronization
- Simplifies debugging — same input always produces same output
- Facilitates tree-shaking and dead code elimination
- Makes the library safe to run in restricted environments (browsers, edge workers, sandboxes)

**Consequences**:
- All I/O (fetching specs from URLs, reading YAML files) must happen outside the library
- The caller is responsible for parsing YAML to JSON before calling `parseSpec()`
- Error reporting uses return values (warnings arrays) rather than logging
- All types are readonly to enforce immutability at the type level

## ADR-004: Security Hardening for Untrusted Input

**Status**: Accepted

**Context**: The transformer processes OpenAPI specs from external sources. Malicious or malformed specs could cause prototype pollution, stack overflow, ReDoS, or memory exhaustion.

**Decision**: Apply defense-in-depth with bounded recursion, forbidden key filtering, memoized resolution, and safe regex compilation.

**Key Limits**:
- Max recursion depth: 50 levels
- Max `$ref` resolutions: 1,000
- Max array items: 10,000
- Max object keys: 10,000
- Max glob pattern length: 256 chars
- Forbidden object keys: `__proto__`, `constructor`, `prototype`
- Null-prototype objects for user-controlled key maps

**Consequences**:
- Extremely large specs (100K+ operations) may be truncated with warnings
- Deeply nested schemas beyond 50 levels are cut off
- These limits are sufficient for all real-world OpenAPI specs

## ADR-005: Express for Runtime Server

**Status**: Accepted

**Context**: The MCP runtime server needs SSE support and a lightweight HTTP framework.

**Decision**: Use Express.js for the runtime server.

**Consequences**:
- Mature, well-documented framework
- Native SSE support
- Large ecosystem of middleware

## ADR-006: Drizzle ORM

**Status**: Accepted

**Context**: The platform needs a database abstraction layer for PostgreSQL. Options include Prisma, TypeORM, Knex, and Drizzle.

**Decision**: Use Drizzle ORM for all database access.

**Consequences**:
- TypeScript-first with full type inference from schema definitions
- SQL-like query builder that maps closely to actual SQL, reducing abstraction leaks
- Lightweight runtime with no code generation step (unlike Prisma)
- Built-in migration support via `drizzle-kit`
- Drizzle Studio provides a visual database browser for development
- Parameterized queries by default, preventing SQL injection

## ADR-007: Shadcn UI Components

**Status**: Accepted

**Context**: The dashboard needs a component library. Options include Material UI, Chakra UI, Radix primitives, and Shadcn UI.

**Decision**: Use Shadcn UI (built on Radix primitives and Tailwind CSS) for all dashboard components.

**Consequences**:
- Components are copied into the project, not installed as a dependency -- full ownership and customization
- Built on accessible Radix primitives with proper ARIA attributes
- Tailwind CSS for styling eliminates CSS-in-JS runtime overhead
- Components are individually adoptable; no all-or-nothing framework lock-in
- Consistent design language with minimal custom CSS

## ADR-008: SSE Transport for MCP

**Status**: Accepted

**Context**: MCP supports multiple transport mechanisms. The runtime needs a transport that works across firewalls, proxies, and standard HTTP infrastructure.

**Decision**: Use Server-Sent Events (SSE) as the primary MCP transport, with Streamable HTTP as a secondary option.

**Consequences**:
- SSE works over standard HTTP/1.1 and passes through most proxies and load balancers without special configuration
- Unidirectional server-to-client stream with JSON-RPC messages posted back via HTTP
- Simpler than WebSockets for the request-response pattern used by MCP tool calls
- Automatic reconnection built into the browser EventSource API
- Nginx reverse proxy requires `proxy_read_timeout` tuning but otherwise works out of the box
- Streamable HTTP transport available for clients that prefer a single-request flow

## ADR-009: Fumadocs for Documentation

**Status**: Accepted

**Context**: The project needs a documentation site integrated with the Next.js application. Options include Nextra, Docusaurus, Mintlify, and Fumadocs.

**Decision**: Use Fumadocs as the documentation framework, hosted at `/docs` within the Next.js app.

**Consequences**:
- Runs inside the existing Next.js application -- no separate build or deployment
- MDX-based content with full React component support
- Built-in search, navigation, and table of contents
- File-system routing matches Next.js conventions
- Shared layout, theme, and authentication with the rest of the app
- Content lives in `apps/web/content/docs/` as `.mdx` files

## ADR-010: AGPL-3.0 Licensing

**Status**: Accepted

**Context**: The project needs a license that keeps the platform open-source while allowing the core library to be freely reusable. The goal is to prevent closed-source competitors from forking the platform without contributing back, while still encouraging adoption of the transformer library.

**Decision**: License the full platform under AGPL-3.0-or-later. License `@apifold/transformer` separately under MIT.

**Consequences**:
- Any organization that modifies and deploys the platform must share their changes (AGPL network clause)
- The transformer library can be used in proprietary projects without restriction
- Follows the proven dual-license model used by Grafana, Plausible, and PostHog
- Clear boundary: `packages/transformer` is MIT, everything else is AGPL-3.0
- Self-hosters must comply with AGPL if they modify the platform code

## ADR-011: Clerk for Authentication

**Status**: Accepted

**Context**: The platform needs user authentication with support for OAuth providers, session management, and webhook-based user lifecycle events.

**Decision**: Use Clerk as the authentication provider.

**Consequences**:
- Managed service eliminates the need to implement password hashing, session storage, and OAuth flows
- Pre-built React components for sign-in, sign-up, and user profile
- Next.js middleware integration for route protection
- Webhook support for syncing user events (creation, deletion) with the database
- User metadata (e.g., `stripeCustomerId`) stored in Clerk's `publicMetadata` field
- External dependency -- requires a Clerk account and API keys

## ADR-012: Stripe for Billing

**Status**: Accepted

**Context**: The managed cloud platform needs subscription billing with support for tiered plans, overage metering, and self-service management.

**Decision**: Use Stripe for all billing, subscription management, and payment processing.

**Consequences**:
- Stripe Checkout handles the payment flow with PCI compliance
- Stripe Billing Portal provides self-service subscription management (plan changes, payment updates, invoice history)
- Webhook-driven architecture keeps billing state in sync without polling
- Usage-based overage billing via Stripe's metered billing API
- Customer IDs stored in Clerk user metadata, linking identity to billing
- Self-hosted deployments bypass all billing logic -- no Stripe dependency required

## ADR-013: CLI Tool for Zero-Friction Adoption

**Status**: Accepted

**Context**: The hosted platform requires a database, Redis, Clerk, and Stripe to run. Developers evaluating APIFold need a way to try it without any infrastructure setup.

**Decision**: Ship `@apifold/cli` -- a standalone CLI tool that converts any OpenAPI spec into a running MCP server with a single command: `npx apifold serve ./spec.yaml`.

**Architecture**:
- Imports `@apifold/transformer` for spec parsing and tool generation
- Lightweight Express server (no Postgres, no Redis, no Clerk)
- Tools generated at startup and held in memory
- HTTP proxy forwards tool calls to the upstream API with auth injection
- Supports both SSE and Streamable HTTP transports
- Config via CLI flags, YAML config file, or env var interpolation

**Security**:
- Server binds to `127.0.0.1` only (not exposed to the network)
- CORS restricted to same-origin (`origin: false`)
- SSE sessions require `X-Session-Id` header verification
- YAML files parsed with `JSON_SCHEMA` to prevent prototype pollution
- Upstream proxy validates protocol (HTTP/HTTPS only) with 30s timeout
- Error messages sanitized before returning to MCP clients

**Commands**:
- `apifold serve <spec>` -- Start an MCP server from an OpenAPI spec
- `apifold transform <spec>` -- Output MCP tool definitions as JSON
- `apifold validate <spec>` -- Parse-only validation with detailed warnings
- `apifold init [spec]` -- Generate an `apifold.config.yaml` template

**Consequences**:
- Zero-config quick start: `npx apifold serve ./stripe-openapi.yaml`
- Single-tenant, local-only -- no multi-user model
- No credential encryption (tokens passed via CLI flags or env vars)
- Shares `@apifold/transformer` with the hosted platform for consistency

## ADR-014: OAuth 2.0 Credential Foundation

**Status**: Accepted

**Context**: Many upstream APIs require OAuth 2.0 for authentication (Google, Slack, Microsoft, GitHub, etc.). The credential system only supported static API keys and bearer tokens.

**Decision**: Extend the credential model to support OAuth 2.0 Authorization Code and Client Credentials flows. Ship with pre-configured provider presets for 8 common OAuth providers.

**Schema Changes** (migration `0003_oauth_credentials`):
- `auth_type` CHECK constraint widened to include `oauth2_authcode` and `oauth2_client_creds`
- New columns: `encrypted_refresh_token`, `scopes`, `token_endpoint`, `client_id`, `encrypted_client_secret`, `token_expires_at`, `provider`
- All new columns are nullable -- existing `api_key`/`bearer` credentials are unaffected

**Provider Presets**: Google, Slack, Microsoft Graph, HubSpot, Salesforce, Notion, GitHub, Spotify. Each preset provides `authorizationEndpoint`, `tokenEndpoint`, and `defaultScopes`. Users supply only their own `client_id` and `client_secret`.

**Security**:
- `refresh_token` and `client_secret` encrypted via AES-256-GCM vault (same as API keys)
- `token_endpoint` validated as HTTPS with private hostname rejection (SSRF prevention)
- `SafeCredential` type excludes all encrypted fields from API responses
- Expiry check enforced on all decrypt operations

**Consequences**:
- OAuth token refresh flow not yet implemented (Sprint 10)
- Authorization endpoint resolved at runtime from provider presets, not stored in DB
- Frontend OAuth UI deferred to Sprint 10
