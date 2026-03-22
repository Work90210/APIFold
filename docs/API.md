# API Reference

All API endpoints are served under `/api` and require authentication unless otherwise noted.

## Authentication

Include your Clerk session token in the `Authorization` header:

```
Authorization: Bearer <session-token>
```

Unauthenticated requests receive a `401` response. Webhook endpoints use their own verification mechanisms (Stripe signature, Clerk signature) and do not require Bearer tokens.

## Response Format

All responses follow a consistent envelope:

```json
// Success
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": { "total": 100, "page": 1, "limit": 20, "hasMore": true }
}

// Error
{
  "success": false,
  "data": null,
  "error": { "code": "NOT_FOUND", "message": "Resource not found" }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body or parameters |
| `AUTH_ERROR` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `UPSTREAM_ERROR` | 502 | Upstream API failure |

---

## Specs

### List Specs

```
GET /api/specs
```

Returns all specs belonging to the authenticated user.

**Auth:** Required (Bearer token)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "spec_abc123",
      "name": "My API",
      "version": "1.0.0",
      "sourceUrl": "https://example.com/openapi.json",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

### Create Spec

```
POST /api/specs
Content-Type: application/json

{
  "name": "My API",
  "version": "1.0.0",
  "sourceUrl": "https://example.com/openapi.json",
  "rawSpec": { ... }
}
```

**Auth:** Required (Bearer token)

**Error Codes:** `VALIDATION_ERROR` (400), `RATE_LIMIT` (429)

### Get Spec

```
GET /api/specs/:id
```

**Auth:** Required (Bearer token)

**Error Codes:** `NOT_FOUND` (404)

### Update Spec

```
PUT /api/specs/:id
Content-Type: application/json

{
  "name": "Updated Name"
}
```

**Auth:** Required (Bearer token)

**Error Codes:** `NOT_FOUND` (404), `VALIDATION_ERROR` (400)

### Delete Spec

```
DELETE /api/specs/:id
```

**Auth:** Required (Bearer token)

**Error Codes:** `NOT_FOUND` (404)

---

## Servers

### List Servers

```
GET /api/servers
```

Returns all MCP servers belonging to the authenticated user.

**Auth:** Required (Bearer token)

### Create Server (from Spec)

```
POST /api/specs/:specId/servers
Content-Type: application/json

{
  "slug": "my-api",
  "name": "My API Server",
  "authMode": "api_key",
  "baseUrl": "https://api.example.com/v1"
}
```

**Supported `authMode` values:** `none`, `api_key`, `bearer`, `oauth2_authcode`, `oauth2_client_creds`

**Auth:** Required (Bearer token)

**Error Codes:** `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `CONFLICT` (409)

### Get Server

```
GET /api/servers/:id
```

**Auth:** Required (Bearer token)

**Error Codes:** `NOT_FOUND` (404)

### Update Server

```
PUT /api/servers/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "rateLimitPerMinute": 120
}
```

**Auth:** Required (Bearer token)

**Error Codes:** `NOT_FOUND` (404), `VALIDATION_ERROR` (400)

### Delete Server

```
DELETE /api/servers/:id
```

**Auth:** Required (Bearer token)

**Error Codes:** `NOT_FOUND` (404)

---

## Tools

### List Tools

```
GET /api/servers/:serverId/tools
```

Returns all tool definitions for a server.

**Auth:** Required (Bearer token)

### Update Tool

```
PUT /api/servers/:serverId/tools/:toolId
Content-Type: application/json

{
  "isActive": false
}
```

**Auth:** Required (Bearer token)

**Error Codes:** `NOT_FOUND` (404), `VALIDATION_ERROR` (400)

### Test Tool

```
POST /api/servers/:serverId/test
Content-Type: application/json

{
  "toolName": "listUsers",
  "input": { "limit": 10 }
}
```

**Auth:** Required (Bearer token)

Returns the tool execution result with timing information.

**Response:**

```json
{
  "success": true,
  "data": {
    "result": { ... },
    "durationMs": 234
  }
}
```

**Error Codes:** `NOT_FOUND` (404), `VALIDATION_ERROR` (400), `UPSTREAM_ERROR` (502)

---

## Credentials

### Create Credential

```
POST /api/servers/:serverId/credentials
Content-Type: application/json

{
  "label": "Production API Key",
  "plaintextKey": "sk-...",
  "authType": "api_key"
}
```

**Auth:** Required (Bearer token)

The key is encrypted at rest using AES-256-GCM and never returned in API responses.

**Supported `authType` values:** `api_key`, `bearer`, `oauth2_authcode`, `oauth2_client_creds`

**OAuth Fields** (optional, for `oauth2_*` auth types):

| Field | Type | Description |
|-------|------|-------------|
| `refreshToken` | string | OAuth refresh token (encrypted at rest) |
| `scopes` | string[] | Granted OAuth scopes (max 50) |
| `tokenEndpoint` | string | Token endpoint URL (must be HTTPS, no private IPs) |
| `clientId` | string | OAuth client ID |
| `clientSecret` | string | OAuth client secret (encrypted at rest) |
| `tokenExpiresAt` | ISO date | When the access token expires |
| `provider` | string | Provider preset ID (e.g., `google`, `slack`, `github`) |

**Example (OAuth):**

```json
{
  "label": "Google Calendar",
  "plaintextKey": "ya29.access-token...",
  "authType": "oauth2_authcode",
  "refreshToken": "1//refresh-token...",
  "scopes": ["https://www.googleapis.com/auth/calendar.readonly"],
  "tokenEndpoint": "https://oauth2.googleapis.com/token",
  "clientId": "123456.apps.googleusercontent.com",
  "clientSecret": "GOCSPX-...",
  "provider": "google"
}
```

**Error Codes:** `VALIDATION_ERROR` (400), `NOT_FOUND` (404)

### Delete Credential

```
DELETE /api/servers/:serverId/credentials?credentialId=:credentialId
```

**Auth:** Required (Bearer token)

**Error Codes:** `NOT_FOUND` (404)

---

## Logs

### List Logs

```
GET /api/servers/:serverId/logs?cursor=abc&limit=50
```

Returns cursor-paginated request logs. Supports optional query parameters: `method`, `statusCode`, `from`, `to`.

**Auth:** Required (Bearer token)

**Response:**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_xyz",
        "method": "GET",
        "path": "/users",
        "statusCode": 200,
        "durationMs": 145,
        "timestamp": "2026-03-20T14:30:00Z"
      }
    ],
    "cursor": "next_abc",
    "hasMore": true
  }
}
```

---

## Usage

### Get Usage Stats

```
GET /api/usage
```

**Auth:** Required (Bearer token)

Returns aggregate usage statistics for the authenticated user.

**Response:**

```json
{
  "success": true,
  "data": {
    "serverCount": 3,
    "activeServers": 2,
    "requestsThisMonth": 1200
  }
}
```

---

## Billing

### Create Checkout Session

```
POST /api/billing/checkout
Content-Type: application/json

{
  "planId": "starter"
}
```

**Auth:** Required (Bearer token)

Creates a Stripe Checkout session for subscribing to a paid plan. The `planId` must be one of `"starter"` or `"pro"`.

**Response:**

```json
{
  "success": true,
  "data": {
    "url": "https://checkout.stripe.com/c/pay/cs_..."
  }
}
```

**Error Codes:** `VALIDATION_ERROR` (400), `RATE_LIMIT` (429)

### Create Portal Session

```
POST /api/billing/portal
```

**Auth:** Required (Bearer token)

Creates a Stripe Billing Portal session for managing an existing subscription (update payment method, view invoices, cancel).

Requires an active Stripe customer. Returns `404` if the user has no billing account.

**Response:**

```json
{
  "success": true,
  "data": {
    "url": "https://billing.stripe.com/p/session/..."
  }
}
```

**Error Codes:** `NOT_FOUND` (404), `RATE_LIMIT` (429)

### Get Budget Cap

```
GET /api/billing/budget
```

**Auth:** Required (Bearer token)

Returns the user's configured overage spending cap.

**Response:**

```json
{
  "success": true,
  "data": {
    "capEur": 10.00
  }
}
```

A `null` value for `capEur` means no spending cap is set.

### Set Budget Cap

```
POST /api/billing/budget
Content-Type: application/json

{
  "capEur": 10.00
}
```

**Auth:** Required (Bearer token)

Sets or removes the overage spending cap. Pass `null` to remove the cap. The value must be between 0 and 10,000 EUR.

**Response:**

```json
{
  "success": true,
  "data": {
    "capEur": 10.00
  }
}
```

**Error Codes:** `VALIDATION_ERROR` (400), `RATE_LIMIT` (429)

---

## Webhooks

### Stripe Webhook

```
POST /api/webhooks/stripe
```

**Auth:** Stripe signature verification (not Bearer token)

Receives Stripe webhook events for subscription lifecycle management. Requires the `stripe-signature` header for verification.

Handled events include:
- `checkout.session.completed` -- New subscription created
- `customer.subscription.updated` -- Plan change or renewal
- `customer.subscription.deleted` -- Subscription cancelled
- `invoice.payment_failed` -- Payment failure

**Response:**

```json
{ "received": true }
```

**Error Codes:** 400 (missing signature or verification failure)

### Clerk Webhook

```
POST /api/webhooks/clerk
```

**Auth:** Clerk signature verification (not Bearer token)

Receives Clerk webhook events for user lifecycle management (user creation, updates, deletion).

---

## Health

### Health Check

```
GET /api/health
```

**Auth:** None

Returns `200 OK` if the service is running.
