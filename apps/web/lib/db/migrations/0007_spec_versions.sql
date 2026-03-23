-- Spec Lifecycle: versioning and release management
-- Migration 0007

BEGIN;

-- Spec versions track each imported revision of a spec
CREATE TABLE spec_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id       UUID NOT NULL REFERENCES specs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  version_label TEXT,
  raw_spec      JSONB NOT NULL,
  tool_snapshot JSONB NOT NULL,
  tool_count    INTEGER NOT NULL,
  diff_summary  JSONB,
  is_breaking   BOOLEAN DEFAULT FALSE,
  source_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(spec_id, version_number)
);

CREATE INDEX idx_spec_versions_spec_id ON spec_versions(spec_id);
CREATE INDEX idx_spec_versions_created_at ON spec_versions(created_at);

-- Spec releases track which version is promoted to which environment
CREATE TABLE spec_releases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id     UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  environment   TEXT NOT NULL DEFAULT 'production',
  version_id    UUID NOT NULL REFERENCES spec_versions(id),
  endpoint_url  TEXT,
  promoted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted_by   TEXT NOT NULL,
  UNIQUE(server_id, environment)
);

CREATE INDEX idx_spec_releases_server_id ON spec_releases(server_id);
CREATE INDEX idx_spec_releases_version_id ON spec_releases(version_id);

-- Link specs to their current version
ALTER TABLE specs ADD COLUMN current_version_id UUID REFERENCES spec_versions(id);

COMMIT;
