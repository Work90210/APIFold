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
