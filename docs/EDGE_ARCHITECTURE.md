# Edge Architecture Design

> Status: Design document. Not yet implemented.

## Overview

The Streamable HTTP transport (Phase 2.4) is inherently stateless — each request comes in, executes, and returns. This makes it a candidate for running on edge workers (Cloudflare Workers, Deno Deploy, Vercel Edge Functions) for sub-100ms global latency.

## Architecture

```
Client → Edge Worker → Upstream API
              ↓
         KV Store (config, tool defs)
              ↓
         Web Crypto (credential decryption)
```

### Request Flow

1. Edge worker receives the Streamable HTTP POST request
2. Looks up MCP server config and tool definitions from KV store (pre-computed at deploy time)
3. Decrypts credentials using Web Crypto API
4. Makes the upstream API call using `fetch()`
5. Returns the JSON-RPC response

## Feasibility

### What works today

- `@apifold/transformer` is pure functions with no Node.js-specific dependencies — runs in any JS runtime
- Streamable HTTP handler is stateless per-request
- Tool definitions can be cached in KV

### What needs refactoring

#### Vault Module

The current vault uses Node.js-specific crypto APIs:
- `crypto.pbkdf2Sync` — has a Web Crypto equivalent (`crypto.subtle.deriveBits` with PBKDF2)
- `crypto.createCipheriv` / `crypto.createDecipheriv` — Web Crypto `crypto.subtle.encrypt/decrypt` with AES-GCM
- `crypto.randomBytes` — `crypto.getRandomValues`

**Preparation step** (implemented): `packages/vault/src/derive-key.ts` includes an async `pbkdf2Async` alternative using `crypto.subtle` behind a feature flag.

#### Runtime Dependencies

The runtime currently depends on:
- Express.js (Node.js-specific) — edge handler would use platform's request/response APIs
- ioredis (Node.js TCP) — edge handler would use REST-based Redis (Upstash REST API)
- postgres.js (Node.js TCP) — edge handler would use HTTP-based Postgres (Neon serverless driver)

## Recommended Approach

1. Create a `packages/edge-runtime/` package with:
   - A platform-agnostic request handler function
   - Web Crypto-based vault encryption/decryption
   - KV-based config and tool definition lookup
   - `fetch()`-based upstream API calls

2. Platform adapters:
   - `adapters/cloudflare-worker.ts` — Cloudflare Workers entry point
   - `adapters/deno-deploy.ts` — Deno Deploy entry point

3. Deployment:
   - Pre-compute and upload server configs + tool definitions to KV at deploy time
   - Deploy edge worker with VAULT_SECRET/VAULT_SALT as encrypted environment variables

## Timeline

This is a Phase 4+ effort. The Streamable HTTP transport must be stable and well-tested before attempting an edge deployment. Estimated effort: 2-3 weeks for the core edge runtime, plus 1 week per platform adapter.
