-- Migration: 0011_webhook_events
-- Stores incoming webhook events for MCP resource serving

CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL CONSTRAINT webhook_payload_size CHECK (octet_length(payload::text) <= 262144),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_server_event ON webhook_events (server_id, event_name);
CREATE INDEX idx_webhook_received ON webhook_events (received_at);

-- Eviction: rows older than 30 days should be purged by a scheduled job:
--   DELETE FROM webhook_events WHERE received_at < NOW() - INTERVAL '30 days';
