-- Migration: 0012_composite_servers
-- Composite servers merge tools from multiple MCP servers under one endpoint

CREATE TABLE composite_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  endpoint_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  transport TEXT NOT NULL DEFAULT 'sse' CHECK (transport IN ('sse', 'streamable-http')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  token_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_composite_user_slug ON composite_servers (user_id, slug);
CREATE UNIQUE INDEX idx_composite_endpoint_id ON composite_servers (endpoint_id);
CREATE INDEX idx_composite_user_id ON composite_servers (user_id);

CREATE TABLE composite_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  composite_id UUID NOT NULL REFERENCES composite_servers(id) ON DELETE CASCADE,
  server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  namespace TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_composite_member_unique ON composite_members (composite_id, server_id);
CREATE UNIQUE INDEX idx_composite_namespace_unique ON composite_members (composite_id, namespace);
CREATE INDEX idx_composite_members_composite ON composite_members (composite_id);
