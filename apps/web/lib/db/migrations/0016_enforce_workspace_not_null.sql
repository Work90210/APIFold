-- Migration: 0016_enforce_workspace_not_null
-- Run AFTER verifying all rows have been backfilled by 0014.
-- Check: SELECT COUNT(*) FROM specs WHERE workspace_id IS NULL;
-- Check: SELECT COUNT(*) FROM mcp_servers WHERE workspace_id IS NULL;
-- Check: SELECT COUNT(*) FROM credentials WHERE workspace_id IS NULL;
-- Check: SELECT COUNT(*) FROM composite_servers WHERE workspace_id IS NULL;
-- All must return 0 before running this migration.

ALTER TABLE specs ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE mcp_servers ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE credentials ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE composite_servers ALTER COLUMN workspace_id SET NOT NULL;
