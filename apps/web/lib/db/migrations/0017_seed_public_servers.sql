-- Seed: 0017_seed_public_servers
-- Pre-configures 18 free public MCP pass-through servers (8 original registry APIs
-- plus 10 new high-traction APIs). Safe to run multiple times (ON CONFLICT DO NOTHING).
--
-- Users connect with their own API key — no account required:
--   GET /mcp/github/sse?userKey=<github_token>
--   GET /mcp/vercel/sse?userKey=<vercel_token>
--   GET /mcp/linear/sse?userKey=<linear_oauth_token>
--   etc.

BEGIN;

-- Sentinel spec row (satisfies NOT NULL FK from mcp_servers.spec_id)
INSERT INTO specs (id, user_id, name, version, raw_spec, tool_count, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'system',
  'public-registry-sentinel',
  '1.0.0',
  '{}',
  0,
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Public server records
-- endpoint_id must be exactly 12 lowercase hex chars (/^[a-f0-9]{12}$/)
INSERT INTO mcp_servers
  (id, spec_id, user_id, slug, name, transport, auth_mode, base_url,
   rate_limit, is_active, is_public, endpoint_id, token_hash, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0001-000000000001',
   '00000000-0000-0000-0000-000000000002',
   'system', 'github', 'GitHub', 'sse', 'bearer',
   'https://api.github.com',
   100, true, true, 'a1b2c3d4e5f1', NULL, NOW(), NOW()),

  ('00000000-0000-0000-0001-000000000002',
   '00000000-0000-0000-0000-000000000002',
   'system', 'stripe', 'Stripe', 'sse', 'bearer',
   'https://api.stripe.com',
   100, true, true, 'a1b2c3d4e5f2', NULL, NOW(), NOW()),

  ('00000000-0000-0000-0001-000000000003',
   '00000000-0000-0000-0000-000000000002',
   'system', 'slack', 'Slack', 'sse', 'bearer',
   'https://slack.com/api',
   100, true, true, 'a1b2c3d4e5f3', NULL, NOW(), NOW()),

  ('00000000-0000-0000-0001-000000000004',
   '00000000-0000-0000-0000-000000000002',
   'system', 'hubspot', 'HubSpot', 'sse', 'bearer',
   'https://api.hubapi.com',
   100, true, true, 'a1b2c3d4e5f4', NULL, NOW(), NOW()),

  ('00000000-0000-0000-0001-000000000005',
   '00000000-0000-0000-0000-000000000002',
   'system', 'twilio', 'Twilio', 'sse', 'api_key',
   'https://api.twilio.com',
   100, true, true, 'a1b2c3d4e5f5', NULL, NOW(), NOW()),

  ('00000000-0000-0000-0001-000000000006',
   '00000000-0000-0000-0000-000000000002',
   'system', 'openai', 'OpenAI', 'sse', 'bearer',
   'https://api.openai.com',
   100, true, true, 'a1b2c3d4e5f6', NULL, NOW(), NOW()),

  ('00000000-0000-0000-0001-000000000007',
   '00000000-0000-0000-0000-000000000002',
   'system', 'notion', 'Notion', 'sse', 'bearer',
   'https://api.notion.com',
   100, true, true, 'a1b2c3d4e5f7', NULL, NOW(), NOW()),

  ('00000000-0000-0000-0001-000000000008',
   '00000000-0000-0000-0000-000000000002',
   'system', 'petstore', 'Petstore (Demo)', 'sse', 'api_key',
   'https://petstore3.swagger.io/api/v3',
   100, true, true, 'a1b2c3d4e5f8', NULL, NOW(), NOW()),

  -- 10 new high-traction public servers
  ('00000000-0000-0000-0001-000000000009',
   '00000000-0000-0000-0000-000000000002',
   'system', 'vercel', 'Vercel', 'sse', 'bearer',
   'https://api.vercel.com',
   100, true, true, 'b1c2d3e4f5a1', NULL, NOW(), NOW()),

  ('00000000-0000-0000-0001-000000000010',
   '00000000-0000-0000-0000-000000000002',
   'system', 'airtable', 'Airtable', 'sse', 'bearer',
   'https://api.airtable.com',
   100, true, true, 'b1c2d3e4f5a2', NULL, NOW(), NOW()),

  ('00000000-0000-0000-0001-000000000011',
   '00000000-0000-0000-0000-000000000002',
   'system', 'cloudflare', 'Cloudflare', 'sse', 'bearer',
   'https://api.cloudflare.com/client/v4',
   100, true, true, 'b1c2d3e4f5a3', NULL, NOW(), NOW()),

  ('00000000-0000-0000-0001-000000000012',
   '00000000-0000-0000-0000-000000000002',
   'system', 'resend', 'Resend', 'sse', 'bearer',
   'https://api.resend.com',
   100, true, true, 'b1c2d3e4f5a4', NULL, NOW(), NOW()),

  ('00000000-0000-0000-0001-000000000013',
   '00000000-0000-0000-0000-000000000002',
   'system', 'calcom', 'Cal.com', 'sse', 'bearer',
   'https://api.cal.com/v2',
   100, true, true, 'b1c2d3e4f5a5', NULL, NOW(), NOW()),

  ('00000000-0000-0000-0001-000000000014',
   '00000000-0000-0000-0000-000000000002',
   'system', 'figma', 'Figma', 'sse', 'bearer',
   'https://api.figma.com/v1',
   100, true, true, 'b1c2d3e4f5a6', NULL, NOW(), NOW()),

  ('00000000-0000-0000-0001-000000000015',
   '00000000-0000-0000-0000-000000000002',
   'system', 'intercom', 'Intercom', 'sse', 'bearer',
   'https://api.intercom.io',
   100, true, true, 'b1c2d3e4f5a7', NULL, NOW(), NOW()),

  ('00000000-0000-0000-0001-000000000016',
   '00000000-0000-0000-0000-000000000002',
   'system', 'mailchimp', 'Mailchimp', 'sse', 'bearer',
   'https://us1.api.mailchimp.com/3.0',
   100, true, true, 'b1c2d3e4f5a8', NULL, NOW(), NOW()),

  ('00000000-0000-0000-0001-000000000017',
   '00000000-0000-0000-0000-000000000002',
   'system', 'supabase', 'Supabase', 'sse', 'bearer',
   'https://api.supabase.com/v1',
   100, true, true, 'b1c2d3e4f5a9', NULL, NOW(), NOW()),

  ('00000000-0000-0000-0001-000000000018',
   '00000000-0000-0000-0000-000000000002',
   'system', 'linear', 'Linear', 'sse', 'bearer',
   'https://api.linear.app',
   100, true, true, 'b1c2d3e4f5b1', NULL, NOW(), NOW())

ON CONFLICT (id) DO NOTHING;

COMMIT;
