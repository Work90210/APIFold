-- Migration: 0018_tool_routing
-- Adds http_method, http_path, and param_map to mcp_tools so the runtime
-- can route tool calls directly to the correct upstream API endpoint
-- instead of falling back to the generic {baseUrl}/tools/{toolName} pattern.

ALTER TABLE mcp_tools
  ADD COLUMN http_method TEXT,
  ADD COLUMN http_path TEXT,
  ADD COLUMN param_map JSONB;

COMMENT ON COLUMN mcp_tools.http_method IS 'HTTP method for the upstream API call (GET, POST, PUT, PATCH, DELETE)';
COMMENT ON COLUMN mcp_tools.http_path IS 'URL path template for the upstream API call, e.g. /v1/customers/{customerId}';
COMMENT ON COLUMN mcp_tools.param_map IS 'Maps input parameter names to their location: path, query, header, or body';

-- Down Migration
-- ALTER TABLE mcp_tools DROP COLUMN IF EXISTS param_map;
-- ALTER TABLE mcp_tools DROP COLUMN IF EXISTS http_path;
-- ALTER TABLE mcp_tools DROP COLUMN IF EXISTS http_method;
