-- Migration: 0019_webhook_secrets
-- Adds per-server webhook signature validation fields.
-- webhook_provider: identifies which SignatureValidator to use (stripe, github, slack, generic).
-- encrypted_webhook_secret: AES-encrypted HMAC secret, decrypted at runtime.
-- Both must be set together (enforced by CHECK constraint).

ALTER TABLE mcp_servers
  ADD COLUMN webhook_provider text,
  ADD COLUMN encrypted_webhook_secret text;

ALTER TABLE mcp_servers
  ADD CONSTRAINT chk_webhook_secret_pair
    CHECK (
      (webhook_provider IS NULL AND encrypted_webhook_secret IS NULL)
      OR (webhook_provider IS NOT NULL AND encrypted_webhook_secret IS NOT NULL)
    );
