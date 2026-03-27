-- Migration: 0015_tool_cache_ttl
-- Per-tool response cache TTL. 0 = no caching (default).

ALTER TABLE mcp_tools ADD COLUMN cache_ttl_seconds INTEGER NOT NULL DEFAULT 0;
