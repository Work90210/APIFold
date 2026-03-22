-- Migration: 0004_analytics_views
-- Creates materialized views for pre-computed hourly analytics aggregates.
-- These are refreshed periodically (e.g., every 5 minutes via cron) to avoid
-- expensive real-time aggregation on large usage_events tables.

-- Hourly tool call stats — pre-aggregated for dashboard charts
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_tool_stats AS
SELECT
  ue.user_id,
  ue.server_id,
  ue.tool_id,
  t.name AS tool_name,
  DATE_TRUNC('hour', ue.timestamp) AS hour,
  COUNT(*) AS call_count,
  COUNT(*) FILTER (WHERE ue.status_code >= 200 AND ue.status_code < 400) AS success_count,
  COUNT(*) FILTER (WHERE ue.status_code >= 400) AS error_count,
  AVG(ue.duration_ms)::INTEGER AS avg_duration_ms,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY ue.duration_ms)::INTEGER AS p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ue.duration_ms)::INTEGER AS p95_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY ue.duration_ms)::INTEGER AS p99_ms
FROM usage_events ue
LEFT JOIN mcp_tools t ON t.id = ue.tool_id
GROUP BY ue.user_id, ue.server_id, ue.tool_id, t.name, DATE_TRUNC('hour', ue.timestamp);

-- Index includes user_id to enable per-user scoping when querying the view
CREATE UNIQUE INDEX IF NOT EXISTS idx_hourly_tool_stats_pk
  ON hourly_tool_stats (user_id, server_id, tool_id, hour);

CREATE INDEX IF NOT EXISTS idx_hourly_tool_stats_server_hour
  ON hourly_tool_stats (user_id, server_id, hour DESC);

-- Function to refresh the materialized view (called by pg_cron or application)
CREATE OR REPLACE FUNCTION refresh_hourly_tool_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY hourly_tool_stats;
END;
$$ LANGUAGE plpgsql;

-- Down Migration (rollback)
-- DROP FUNCTION IF EXISTS refresh_hourly_tool_stats();
-- DROP INDEX IF EXISTS idx_hourly_tool_stats_server_hour;
-- DROP INDEX IF EXISTS idx_hourly_tool_stats_pk;
-- DROP MATERIALIZED VIEW IF EXISTS hourly_tool_stats;
