-- Migration: 0005_access_profiles
-- Adds access profiles for tool-level permission scoping.
-- Profiles are named subsets of a server's tools that control which
-- tools an agent can see (tools/list) and call (tools/call).

CREATE TABLE IF NOT EXISTS access_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  tool_ids UUID[] NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_server_slug
  ON access_profiles (server_id, slug);

CREATE INDEX IF NOT EXISTS idx_profiles_server_id
  ON access_profiles (server_id);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id
  ON access_profiles (user_id);

-- Auto-update timestamp trigger
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON access_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add profile_id FK to credentials table
ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS profile_id UUID
    REFERENCES access_profiles(id) ON DELETE SET NULL;

-- Down Migration (rollback)
-- ALTER TABLE credentials DROP COLUMN IF EXISTS profile_id;
-- DROP TRIGGER IF EXISTS trg_profiles_updated_at ON access_profiles;
-- DROP INDEX IF EXISTS idx_profiles_user_id;
-- DROP INDEX IF EXISTS idx_profiles_server_id;
-- DROP INDEX IF EXISTS idx_profiles_server_slug;
-- DROP TABLE IF EXISTS access_profiles;
