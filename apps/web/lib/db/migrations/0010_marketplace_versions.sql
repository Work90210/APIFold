-- Marketplace listing versions: tracks each published revision
-- Migration 0010

BEGIN;

CREATE TABLE marketplace_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  version     TEXT NOT NULL,
  spec_hash   TEXT NOT NULL,
  raw_spec    TEXT NOT NULL,
  changelog   TEXT,
  tool_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_mv_listing_version ON marketplace_versions (listing_id, version);
CREATE INDEX idx_mv_listing ON marketplace_versions (listing_id);

COMMIT;
