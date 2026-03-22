-- Migration: 0003_oauth_credentials
-- Extends the credentials table with OAuth 2.0 columns for authorization code
-- and client credentials flows.

-- Step 1: Widen auth_type to support OAuth grant types.
-- Drizzle uses a text column with an application-level enum, so we only need
-- to drop and re-add the CHECK constraint (no type cast required).
ALTER TABLE credentials
  DROP CONSTRAINT IF EXISTS credentials_auth_type_check;

ALTER TABLE credentials
  ADD CONSTRAINT credentials_auth_type_check
    CHECK (auth_type IN ('api_key', 'bearer', 'oauth2_authcode', 'oauth2_client_creds'));

-- Step 2: Add OAuth-specific columns. All nullable so existing rows stay valid.
ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS encrypted_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS scopes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS token_endpoint TEXT,
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_client_secret TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider TEXT;

-- Step 3: Index for provider lookups (partial — only OAuth rows).
CREATE INDEX IF NOT EXISTS idx_credentials_provider
  ON credentials (provider)
  WHERE provider IS NOT NULL;

-- Down Migration (rollback)
-- DROP INDEX IF EXISTS idx_credentials_provider;
-- ALTER TABLE credentials
--   DROP COLUMN IF EXISTS encrypted_refresh_token,
--   DROP COLUMN IF EXISTS scopes,
--   DROP COLUMN IF EXISTS token_endpoint,
--   DROP COLUMN IF EXISTS client_id,
--   DROP COLUMN IF EXISTS encrypted_client_secret,
--   DROP COLUMN IF EXISTS token_expires_at,
--   DROP COLUMN IF EXISTS provider;
-- ALTER TABLE credentials DROP CONSTRAINT IF EXISTS credentials_auth_type_check;
-- ALTER TABLE credentials ADD CONSTRAINT credentials_auth_type_check
--   CHECK (auth_type IN ('api_key', 'bearer'));
