-- Migration: 0006_endpoint_ids
-- Adds unique, unguessable endpoint identifiers to MCP servers for public URLs,
-- and custom domain support for paid plans.

-- Step 1: Add endpoint_id column (nullable initially for backfill)
ALTER TABLE mcp_servers
  ADD COLUMN IF NOT EXISTS endpoint_id TEXT;

-- Step 2: Backfill existing servers with random 12-char hex endpoint IDs.
-- Uses gen_random_bytes(6) for 48 bits of cryptographic randomness.
-- Loop handles the astronomically unlikely collision case.
DO $$
DECLARE
  row_record RECORD;
  new_id TEXT;
  retries INT;
BEGIN
  FOR row_record IN SELECT id FROM mcp_servers WHERE endpoint_id IS NULL LOOP
    retries := 0;
    LOOP
      new_id := encode(gen_random_bytes(6), 'hex');
      BEGIN
        UPDATE mcp_servers SET endpoint_id = new_id WHERE id = row_record.id;
        EXIT; -- success
      EXCEPTION WHEN unique_violation THEN
        retries := retries + 1;
        IF retries > 10 THEN
          RAISE EXCEPTION 'Failed to generate unique endpoint_id after 10 retries';
        END IF;
      END;
    END LOOP;
  END LOOP;
END $$;

-- Step 3: Make endpoint_id NOT NULL after backfill
ALTER TABLE mcp_servers
  ALTER COLUMN endpoint_id SET NOT NULL;

-- Step 4: Create unique index on endpoint_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_servers_endpoint_id
  ON mcp_servers (endpoint_id);

-- Step 5: Add custom domain columns
ALTER TABLE mcp_servers
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS domain_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS domain_verification_token TEXT;

-- Step 6: Unique partial index on custom_domain (only verified domains)
CREATE UNIQUE INDEX IF NOT EXISTS idx_servers_custom_domain
  ON mcp_servers (custom_domain)
  WHERE custom_domain IS NOT NULL;

-- Down Migration (rollback)
-- DROP INDEX IF EXISTS idx_servers_custom_domain;
-- ALTER TABLE mcp_servers DROP COLUMN IF EXISTS domain_verification_token;
-- ALTER TABLE mcp_servers DROP COLUMN IF EXISTS domain_verified_at;
-- ALTER TABLE mcp_servers DROP COLUMN IF EXISTS custom_domain;
-- DROP INDEX IF EXISTS idx_servers_endpoint_id;
-- ALTER TABLE mcp_servers DROP COLUMN IF EXISTS endpoint_id;
