import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export interface SignatureValidator {
  readonly provider: string;
  validate(payload: string, headers: Readonly<Record<string, string | string[] | undefined>>): boolean;
}

export class StripeSignatureValidator implements SignatureValidator {
  readonly provider = 'stripe';
  private readonly secret: string;
  private readonly toleranceSec: number;

  constructor(secret: string, toleranceSec = 300) {
    this.secret = secret;
    this.toleranceSec = toleranceSec;
  }

  validate(payload: string, headers: Readonly<Record<string, string | string[] | undefined>>): boolean {
    const sigHeader = headers['stripe-signature'];
    if (typeof sigHeader !== 'string') return false;

    const parts = new Map(
      sigHeader.split(',').map((part) => {
        const [key, ...rest] = part.split('=');
        return [key!.trim(), rest.join('=')] as const;
      }),
    );

    const timestamp = parts.get('t');
    const v1Sig = parts.get('v1');
    if (!timestamp || !v1Sig) return false;

    const ts = parseInt(timestamp, 10);
    if (isNaN(ts)) return false;

    const age = Math.abs(Math.floor(Date.now() / 1000) - ts);
    if (age > this.toleranceSec) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const expected = createHmac('sha256', this.secret).update(signedPayload).digest('hex');

    return safeCompare(expected, v1Sig);
  }
}

/**
 * GitHub webhook signature validator.
 *
 * Note: GitHub signatures do not include a timestamp, so this validator
 * has no built-in replay protection. Consumers should implement
 * idempotency checks (e.g. tracking delivery IDs via X-GitHub-Delivery)
 * if replay resistance is required.
 */
export class GitHubSignatureValidator implements SignatureValidator {
  readonly provider = 'github';
  private readonly secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  validate(payload: string, headers: Readonly<Record<string, string | string[] | undefined>>): boolean {
    const sigHeader = headers['x-hub-signature-256'];
    if (typeof sigHeader !== 'string') return false;

    const prefix = 'sha256=';
    if (!sigHeader.startsWith(prefix)) return false;
    const signature = sigHeader.slice(prefix.length);

    const expected = createHmac('sha256', this.secret).update(payload).digest('hex');
    return safeCompare(expected, signature);
  }
}

export class SlackSignatureValidator implements SignatureValidator {
  readonly provider = 'slack';
  private readonly signingSecret: string;
  private readonly toleranceSec: number;

  constructor(signingSecret: string, toleranceSec = 300) {
    this.signingSecret = signingSecret;
    this.toleranceSec = toleranceSec;
  }

  validate(payload: string, headers: Readonly<Record<string, string | string[] | undefined>>): boolean {
    const sigHeader = headers['x-slack-signature'];
    const timestampHeader = headers['x-slack-request-timestamp'];
    if (typeof sigHeader !== 'string' || typeof timestampHeader !== 'string') return false;

    const prefix = 'v0=';
    if (!sigHeader.startsWith(prefix)) return false;
    const signature = sigHeader.slice(prefix.length);

    const ts = parseInt(timestampHeader, 10);
    if (isNaN(ts)) return false;

    const age = Math.abs(Math.floor(Date.now() / 1000) - ts);
    if (age > this.toleranceSec) return false;

    const baseString = `v0:${timestampHeader}:${payload}`;
    const expected = createHmac('sha256', this.signingSecret).update(baseString).digest('hex');

    return safeCompare(expected, signature);
  }
}

/**
 * Generic HMAC-SHA256 webhook signature validator.
 *
 * Note: This validator has no timestamp or replay protection.
 * Consumers should implement their own idempotency tracking
 * (e.g. via a unique event ID header) if replay resistance is required.
 */
export class GenericHmacValidator implements SignatureValidator {
  readonly provider = 'generic';
  private readonly secret: string;
  private readonly headerName: string;

  constructor(secret: string, headerName = 'x-webhook-signature') {
    this.secret = secret;
    this.headerName = headerName.toLowerCase();
  }

  validate(payload: string, headers: Readonly<Record<string, string | string[] | undefined>>): boolean {
    const sigHeader = headers[this.headerName];
    if (typeof sigHeader !== 'string') return false;

    const expected = createHmac('sha256', this.secret).update(payload).digest('hex');
    return safeCompare(expected, sigHeader);
  }
}

// Random key generated at process startup — unknown to external parties,
// used only to normalise inputs to fixed-length buffers for constant-time comparison.
const COMPARE_KEY = randomBytes(32);

function safeCompare(expected: string, provided: string): boolean {
  // Always hash both inputs so comparison time is constant regardless of
  // input length. This prevents timing side-channels that could leak the
  // expected signature length or content.
  const hashA = createHmac('sha256', COMPARE_KEY).update(expected).digest();
  const hashB = createHmac('sha256', COMPARE_KEY).update(provided).digest();
  // timingSafeEqual requires equal-length buffers — guaranteed here (both SHA-256 = 32 bytes)
  return timingSafeEqual(hashA, hashB) && expected.length === provided.length;
}
