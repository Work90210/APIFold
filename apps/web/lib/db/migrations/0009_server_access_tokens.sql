-- Per-server access tokens for endpoint authentication
-- Migration 0009
--
-- Each MCP server gets its own bearer token (af_ prefixed).
-- Only the SHA-256 hash is stored. Plaintext returned once at creation.
-- Existing servers get a sentinel value requiring token generation on next visit.

BEGIN;

ALTER TABLE mcp_servers
  ADD COLUMN token_hash TEXT;

-- Existing servers: set sentinel to prompt token generation on next dashboard visit.
-- A NULL token_hash means "legacy, no per-server token" — falls back to global MCP_API_KEY.
-- The dashboard will show a "Generate Access Token" prompt for these servers.

COMMENT ON COLUMN mcp_servers.token_hash IS
  'SHA-256 hex hash of the per-server af_ bearer token. NULL for legacy servers.';

COMMIT;
