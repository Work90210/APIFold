-- Migration: 0017_public_servers
-- Adds is_public flag to mcp_servers for pass-through endpoints that accept
-- a caller-supplied API key instead of a stored credential.

ALTER TABLE mcp_servers
  ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN mcp_servers.is_public IS
  'When true, no af_ bearer token is required. Callers supply their own API key via ?userKey or X-User-Key.';

CREATE INDEX idx_servers_public ON mcp_servers (is_public) WHERE is_public = true;

-- Down Migration
-- DROP INDEX IF EXISTS idx_servers_public;
-- ALTER TABLE mcp_servers DROP COLUMN IF EXISTS is_public;
