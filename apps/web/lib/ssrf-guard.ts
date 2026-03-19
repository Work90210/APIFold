import { promises as dns } from 'node:dns';

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
  /^ff[0-9a-f]{2}:/i,
  /^::$/,
];

const MAX_SPEC_SIZE = 10 * 1024 * 1024; // 10MB
const FETCH_TIMEOUT_MS = 15_000;
const ALLOWED_PORTS = new Set(['', '80', '443', '8080', '8443']);

function isPrivateIP(addr: string): boolean {
  const mapped = addr.match(/^::ffff:(.+)$/i);
  const normalized = mapped ? mapped[1]! : addr;
  return PRIVATE_RANGES.some((pattern) => pattern.test(normalized));
}

async function resolveAllAddresses(hostname: string): Promise<string[]> {
  const allAddresses: string[] = [];

  try {
    const ipv4 = await dns.resolve4(hostname);
    allAddresses.push(...ipv4);
  } catch {
    // No A records
  }

  try {
    const ipv6 = await dns.resolve6(hostname);
    allAddresses.push(...ipv6);
  } catch {
    // No AAAA records
  }

  if (allAddresses.length === 0) {
    throw new Error('Could not resolve hostname');
  }

  return allAddresses;
}

function validateAddresses(addresses: readonly string[]): void {
  for (const addr of addresses) {
    if (isPrivateIP(addr)) {
      throw new Error('URL resolves to a private IP address');
    }
  }
}

function validateUrl(url: string): URL {
  const parsed = new URL(url);

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP/HTTPS URLs are allowed');
  }

  if (!ALLOWED_PORTS.has(parsed.port)) {
    throw new Error(`Port ${parsed.port || 'default'} is not allowed`);
  }

  return parsed;
}

/**
 * Fetch a spec from a URL with SSRF protection.
 * Resolves DNS, validates IPs. Uses original hostname for HTTPS cert validity.
 */
export async function fetchSpecFromUrl(url: string): Promise<unknown> {
  const parsed = validateUrl(url);

  const addresses = await resolveAllAddresses(parsed.hostname);
  validateAddresses(addresses);

  // For HTTPS, keep the original hostname so TLS cert validation works.
  // DNS rebinding is mitigated by blocking redirects and validating all resolved IPs.
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { Accept: 'application/json' },
    redirect: 'error',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch spec: HTTP ${response.status}`);
  }

  const text = await response.text();
  if (text.length > MAX_SPEC_SIZE) {
    throw new Error('Spec file exceeds 10MB limit');
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Spec must be valid JSON');
  }
}

/**
 * Safe fetch with SSRF protection + timeout.
 * Validates URL, resolves DNS, checks for private IPs.
 */
export async function safeFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const parsed = validateUrl(url);

  const addresses = await resolveAllAddresses(parsed.hostname);
  validateAddresses(addresses);

  // Use original URL for HTTPS cert validity. Redirects blocked.
  const signal = init?.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS);

  return fetch(url, {
    ...init,
    signal,
    redirect: 'error',
  });
}
