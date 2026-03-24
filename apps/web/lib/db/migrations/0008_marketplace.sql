-- Marketplace: listings, installs, reports, audit log
-- Migration 0008

BEGIN;

-- marketplace_listings
CREATE TABLE marketplace_listings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT UNIQUE NOT NULL,
  name                  TEXT NOT NULL,
  short_description     TEXT NOT NULL,
  long_description      TEXT NOT NULL,
  category              TEXT NOT NULL,
  tags                  TEXT[] DEFAULT '{}',
  icon_url              TEXT,
  author_id             TEXT NOT NULL,
  author_type           TEXT NOT NULL DEFAULT 'community',
  raw_spec              JSONB NOT NULL,
  spec_version          TEXT NOT NULL,
  recommended_base_url  TEXT NOT NULL,
  recommended_auth_mode TEXT NOT NULL,
  default_tool_filter   JSONB,
  setup_guide           TEXT,
  api_docs_url          TEXT,
  status                TEXT NOT NULL DEFAULT 'draft',
  review_notes          TEXT,
  reviewed_by           TEXT,
  reviewed_at           TIMESTAMPTZ,
  install_count         INTEGER NOT NULL DEFAULT 0,
  featured              BOOLEAN NOT NULL DEFAULT false,
  spec_hash             TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- marketplace_installs
CREATE TABLE marketplace_installs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id             UUID NOT NULL REFERENCES marketplace_listings(id),
  user_id                TEXT NOT NULL,
  server_id              UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  spec_id                UUID NOT NULL REFERENCES specs(id) ON DELETE CASCADE,
  installed_version_hash TEXT NOT NULL,
  is_update_available    BOOLEAN NOT NULL DEFAULT false,
  listing_suspended      BOOLEAN NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- marketplace_reports
CREATE TABLE marketplace_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES marketplace_listings(id),
  reporter_id TEXT NOT NULL,
  reason      TEXT NOT NULL,
  details     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',
  reviewed_by TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- marketplace_audit_log (immutable)
CREATE TABLE marketplace_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      UUID REFERENCES marketplace_listings(id),
  actor_id        TEXT NOT NULL,
  action          TEXT NOT NULL,
  reason          TEXT NOT NULL,
  previous_status TEXT NOT NULL,
  new_status      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes: listings
CREATE UNIQUE INDEX idx_ml_slug ON marketplace_listings (slug);
CREATE INDEX idx_ml_status ON marketplace_listings (status);
CREATE INDEX idx_ml_category ON marketplace_listings (category) WHERE status = 'published';
CREATE INDEX idx_ml_author ON marketplace_listings (author_id);
CREATE INDEX idx_ml_featured ON marketplace_listings (featured) WHERE status = 'published';
-- Full-text search: use ILIKE fallback for now.
-- A GIN index on a trigger-maintained tsvector column can be added in a future migration
-- (Postgres requires IMMUTABLE functions for expression indexes, and array_to_string is STABLE).

-- Indexes: installs
CREATE UNIQUE INDEX idx_mi_listing_user ON marketplace_installs (listing_id, user_id);
CREATE INDEX idx_mi_user ON marketplace_installs (user_id);
CREATE INDEX idx_mi_server ON marketplace_installs (server_id);

-- Indexes: reports
CREATE INDEX idx_mrp_listing ON marketplace_reports (listing_id);
CREATE INDEX idx_mrp_status ON marketplace_reports (status) WHERE status = 'open';
CREATE UNIQUE INDEX idx_mrp_user_listing ON marketplace_reports (reporter_id, listing_id);

-- Indexes: audit log
CREATE INDEX idx_mal_listing ON marketplace_audit_log (listing_id);

-- Trigger: decrement install_count on install deletion
CREATE OR REPLACE FUNCTION decrement_install_count() RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_listings SET install_count = GREATEST(install_count - 1, 0)
  WHERE id = OLD.listing_id;
  RETURN OLD;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_decrement_install_count
  AFTER DELETE ON marketplace_installs
  FOR EACH ROW EXECUTE FUNCTION decrement_install_count();

-- Trigger: auto-update updated_at on marketplace_listings
CREATE OR REPLACE FUNCTION update_marketplace_listing_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_marketplace_listing_timestamp
  BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION update_marketplace_listing_timestamp();

COMMIT;
