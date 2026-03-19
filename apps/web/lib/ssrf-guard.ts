import { promises as dns } from 'node:dns';

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

const MAX_SPEC_SIZE = 10 * 1024 * 1024; // 10MB
const FETCH_TIMEOUT_MS = 15_000;
const ALLOWED_PORTS = new Set(['', '80', '443', '8080', '8443']);

function isPrivateIP(addr: string): boolean {
  // Also check IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
  const mapped = addr.match(/^::ffff:(.+)$/i);
  const normalized = mapped ? mapped[1]! : addr;
  return PRIVATE_RANGES.some((pattern) => pattern.test(normalized));
}

async function resolveAllAddresses(hostname: string): Promise<string[]> {
  const allAddresses: string[] = [];

  // Resolve both A and AAAA records
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

/**
 * Fetch a spec from a URL with SSRF protection.
 * Resolves DNS, validates IPs, then fetches using the resolved IP
 * to prevent DNS rebinding attacks.
 */
export async function fetchSpecFromUrl(url: string): Promise<unknown> {
  const parsed = new URL(url);

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP/HTTPS URLs are allowed');
  }

  if (!ALLOWED_PORTS.has(parsed.port)) {
    throw new Error(`Port ${parsed.port || 'default'} is not allowed`);
  }

  // Resolve all DNS records (IPv4 + IPv6) and validate
  const addresses = await resolveAllAddresses(parsed.hostname);
  validateAddresses(addresses);

  // Fetch using the resolved IP to prevent DNS rebinding.
  const resolvedUrl = new URL(url);
  const originalHost = resolvedUrl.host;
  resolvedUrl.hostname = addresses[0]!;

  const response = await fetch(resolvedUrl.toString(), {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      Accept: 'application/json',
      Host: originalHost,
    },
    redirect: 'error', // Block redirects — they could redirect to internal IPs
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch spec: HTTP ${response.status}`);
  }

  const text = await response.text();
  if (text.length > MAX_SPEC_SIZE) {
    throw new Error('Spec file exceeds 10MB limit');
  }

  return parseJsonOrYaml(text);
}

/**
 * Safe fetch with SSRF protection. Validates that a URL
 * does not target private/internal hosts. For use by the test endpoint.
 */
export async function safeFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const parsed = new URL(url);

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP/HTTPS URLs are allowed');
  }

  if (!ALLOWED_PORTS.has(parsed.port)) {
    throw new Error(`Port ${parsed.port || 'default'} is not allowed`);
  }

  const addresses = await resolveAllAddresses(parsed.hostname);
  validateAddresses(addresses);

  const resolvedUrl = new URL(url);
  const originalHost = resolvedUrl.host;
  resolvedUrl.hostname = addresses[0]!;

  return fetch(resolvedUrl.toString(), {
    ...init,
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      Host: originalHost,
    },
    redirect: 'error',
  });
}

function parseJsonOrYaml(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Spec must be valid JSON');
  }
}
