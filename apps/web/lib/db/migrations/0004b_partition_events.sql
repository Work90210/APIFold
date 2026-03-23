-- Migration: 0004b_partition_events
-- Converts usage_events and request_logs to monthly partitioned tables
-- for better query performance and data lifecycle management.
--
-- NOTE: This migration requires downtime or careful planning because it
-- recreates the tables. In production, run during a maintenance window.

-- Step 1: Rename existing tables
ALTER TABLE usage_events RENAME TO usage_events_old;
ALTER TABLE request_logs RENAME TO request_logs_old;

-- Step 2: Create partitioned tables with identical schema

CREATE TABLE usage_events (
  id UUID DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL,
  tool_id UUID,
  user_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms INTEGER NOT NULL,
  status_code INTEGER NOT NULL,
  error_code TEXT,
  PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

CREATE TABLE request_logs (
  id UUID DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL,
  tool_id UUID,
  user_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Step 3: Create partitions for current and next 3 months
-- (In production, a cron job would create future partitions automatically)

DO $$
DECLARE
  start_date DATE;
  end_date DATE;
  partition_name TEXT;
BEGIN
  -- Create partitions for current month and next 3 months
  FOR i IN 0..3 LOOP
    start_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' months')::INTERVAL);
    end_date := start_date + INTERVAL '1 month';

    -- usage_events partition
    partition_name := 'usage_events_' || TO_CHAR(start_date, 'YYYY_MM');
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF usage_events FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date
    );

    -- request_logs partition
    partition_name := 'request_logs_' || TO_CHAR(start_date, 'YYYY_MM');
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF request_logs FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date
    );
  END LOOP;

  -- Create a default partition for data outside the defined ranges
  EXECUTE 'CREATE TABLE IF NOT EXISTS usage_events_default PARTITION OF usage_events DEFAULT';
  EXECUTE 'CREATE TABLE IF NOT EXISTS request_logs_default PARTITION OF request_logs DEFAULT';
END $$;

-- Step 4: Recreate indexes on partitioned tables
CREATE INDEX idx_usage_server_id ON usage_events (server_id);
CREATE INDEX idx_usage_user_id ON usage_events (user_id);
CREATE INDEX idx_usage_timestamp ON usage_events (timestamp);
CREATE INDEX idx_usage_tool_id ON usage_events (tool_id);
CREATE INDEX idx_usage_server_timestamp ON usage_events (server_id, timestamp);

CREATE INDEX idx_logs_server_id ON request_logs (server_id);
CREATE INDEX idx_logs_user_id ON request_logs (user_id);
CREATE INDEX idx_logs_timestamp ON request_logs (timestamp);
CREATE INDEX idx_logs_request_id ON request_logs (request_id);
CREATE INDEX idx_logs_tool_id ON request_logs (tool_id);
CREATE INDEX idx_logs_server_timestamp ON request_logs (server_id, timestamp);

-- Step 5: Migrate existing data (if any)
INSERT INTO usage_events SELECT * FROM usage_events_old;
INSERT INTO request_logs SELECT * FROM request_logs_old;

-- Step 6: Drop old tables
DROP TABLE usage_events_old;
DROP TABLE request_logs_old;

-- Down Migration (rollback)
-- This is complex — requires recreating the non-partitioned tables and
-- migrating data back. In practice, partitioning is a one-way migration.
-- To rollback:
-- 1. CREATE TABLE usage_events_flat (LIKE usage_events INCLUDING ALL);
-- 2. INSERT INTO usage_events_flat SELECT * FROM usage_events;
-- 3. DROP TABLE usage_events CASCADE;
-- 4. ALTER TABLE usage_events_flat RENAME TO usage_events;
-- (Same for request_logs)
