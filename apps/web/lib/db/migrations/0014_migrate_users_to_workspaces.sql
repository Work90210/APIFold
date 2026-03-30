-- Migration: 0014_migrate_users_to_workspaces
-- Creates a default workspace per existing user_id, sets as owner, backfills workspace_id.

-- 1. Create a workspace for each distinct user
INSERT INTO workspaces (id, name, slug, plan)
SELECT
  gen_random_uuid(),
  'Personal',
  'user-' || encode(digest(u.user_id, 'sha256'), 'hex'),
  'free'
FROM (
  SELECT DISTINCT user_id FROM specs
  UNION
  SELECT DISTINCT user_id FROM mcp_servers
  UNION
  SELECT DISTINCT user_id FROM credentials
  UNION
  SELECT DISTINCT user_id FROM composite_servers
) u
ON CONFLICT (slug) DO NOTHING;

-- 2. Add each user as owner of their workspace
INSERT INTO workspace_members (workspace_id, user_id, role, accepted_at)
SELECT w.id, u.user_id, 'owner', NOW()
FROM (
  SELECT DISTINCT user_id FROM specs
  UNION
  SELECT DISTINCT user_id FROM mcp_servers
  UNION
  SELECT DISTINCT user_id FROM credentials
  UNION
  SELECT DISTINCT user_id FROM composite_servers
) u
JOIN workspaces w ON w.slug = 'user-' || encode(digest(u.user_id, 'sha256'), 'hex')
ON CONFLICT DO NOTHING;

-- 3. Backfill workspace_id on all tables
UPDATE specs s
SET workspace_id = w.id
FROM workspaces w
WHERE w.slug = 'user-' || encode(digest(s.user_id, 'sha256'), 'hex')
  AND s.workspace_id IS NULL;

UPDATE mcp_servers s
SET workspace_id = w.id
FROM workspaces w
WHERE w.slug = 'user-' || encode(digest(s.user_id, 'sha256'), 'hex')
  AND s.workspace_id IS NULL;

UPDATE credentials c
SET workspace_id = w.id
FROM workspaces w
WHERE w.slug = 'user-' || encode(digest(c.user_id, 'sha256'), 'hex')
  AND c.workspace_id IS NULL;

UPDATE composite_servers cs
SET workspace_id = w.id
FROM workspaces w
WHERE w.slug = 'user-' || encode(digest(cs.user_id, 'sha256'), 'hex')
  AND cs.workspace_id IS NULL;

-- 4. Add NOT NULL constraints and indexes now that data is backfilled
-- Note: In production, verify all rows have workspace_id before running these.
-- ALTER TABLE specs ALTER COLUMN workspace_id SET NOT NULL;
-- ALTER TABLE mcp_servers ALTER COLUMN workspace_id SET NOT NULL;
-- ALTER TABLE credentials ALTER COLUMN workspace_id SET NOT NULL;
-- ALTER TABLE composite_servers ALTER COLUMN workspace_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_specs_workspace ON specs (workspace_id);
CREATE INDEX IF NOT EXISTS idx_servers_workspace ON mcp_servers (workspace_id);
CREATE INDEX IF NOT EXISTS idx_credentials_workspace ON credentials (workspace_id);
CREATE INDEX IF NOT EXISTS idx_composite_workspace ON composite_servers (workspace_id);
