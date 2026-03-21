# Cloudflare Setup Guide

This guide covers configuring Cloudflare as a reverse proxy and DDoS protection layer for APIFold.

## DNS Configuration

1. Add your domain to Cloudflare
2. Create `A` records pointing to your server IP:
   - `@` (root) → Server IP (Proxied, orange cloud)
   - `www` → Server IP (Proxied, orange cloud)
   - `runtime` → Server IP (see SSE note below)

## SSL Configuration

Set SSL mode to **Full (Strict)**:
- Cloudflare terminates TLS at the edge
- Re-encrypts traffic to your origin using your origin certificate
- Requires a valid certificate on the origin server

## SSE Endpoint Configuration

Cloudflare may buffer SSE responses, breaking real-time streaming. Two approaches:

### Option A: SSE through Cloudflare (recommended for most cases)

Set these response headers on SSE endpoints (already configured in the runtime):
- `Cache-Control: no-cache`
- `X-Accel-Buffering: no`

Add a Cloudflare Cache Rule:
- **Match**: URI Path contains `/mcp/` AND URI Path ends with `/sse`
- **Actions**: Bypass Cache, Disable Apps, Disable Rocket Loader

### Option B: DNS-only for runtime subdomain

If Cloudflare's proxy breaks SSE connections:
1. Create a `runtime` subdomain: `runtime.apifold.dev`
2. Set the DNS record to **DNS-only** (grey cloud, no proxy)
3. Terminate TLS at the origin Nginx with Let's Encrypt
4. Set `RUNTIME_PUBLIC_URL=https://runtime.apifold.dev`

## Rate Limiting

Configure additional Cloudflare rate limiting rules as an outer defense layer:

1. **API endpoints**: 100 requests per minute per IP on `/api/*`
2. **MCP endpoints**: 30 requests per minute per IP on `/mcp/*`
3. **Global**: 1000 requests per 10 minutes per IP

These complement the app-level Redis-based rate limiting.

## Bot Management

Enable **Bot Fight Mode** (free tier) in Security > Bots:
- Challenges suspected bot traffic
- Does not affect API clients with proper headers

## Page Rules / Cache Rules

| Path Pattern | Action |
|-------------|--------|
| `/api/*` | Bypass Cache, Disable Rocket Loader |
| `/mcp/*` | Bypass Cache, Disable Rocket Loader, Disable Minification |
| `/_next/static/*` | Cache Everything, Edge TTL: 1 month |

## Origin Access Restriction (Optional)

Restrict your origin server to only accept connections from Cloudflare IPs.

The Nginx configuration (`infra/nginx/nginx.conf`) includes `set_real_ip_from` directives for all Cloudflare IP ranges, ensuring rate limiting uses the real client IP.

For additional security, add firewall rules to your server:
```bash
# Allow only Cloudflare IPs on ports 80/443
# See: https://www.cloudflare.com/ips/
```

## Verifying Setup

1. Check SSL: `curl -I https://your-domain.com` — should show `cf-ray` header
2. Check real IP: Verify Nginx logs show real client IPs, not Cloudflare edge IPs
3. Test SSE: Connect to an MCP endpoint and verify streaming works
4. Test rate limiting: Send requests exceeding the limit and verify 429 responses
