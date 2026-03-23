import { promises as dns } from 'node:dns';
import http from 'node:http';
import https from 'node:https';

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^0\./,
  /^::1$/,
  /^f[cd][0-9a-f]{2}:/i,
  /^fe[89ab][0-9a-f]:/i,
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
 * Create an HTTP(S) agent with a pinned DNS lookup.
 * The lookup callback only returns pre-validated addresses, closing the
 * TOCTOU window between DNS resolution and TCP connection.
 */
function createPinnedAgent(
  protocol: 'http:' | 'https:',
  validatedAddresses: readonly string[],
): http.Agent | https.Agent {
  // Pick the first validated IPv4 address (preferred) or first available
  const ipv4 = validatedAddresses.find((a) => !a.includes(':'));
  const pinnedAddr = ipv4 ?? validatedAddresses[0]!;
  const family = pinnedAddr.includes(':') ? 6 : 4;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lookup = (...args: any[]): void => {
    // Supports both (hostname, cb) and (hostname, options, cb) signatures
    const cb = typeof args[1] === 'function' ? args[1] : args[2];
    cb(null, pinnedAddr, family);
  };

  const AgentClass = protocol === 'https:' ? https.Agent : http.Agent;
  return new AgentClass({ lookup, maxSockets: 1 });
}

const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Low-level transport wrapper with DNS pinning for SSRF protection.
 * Blocks redirects and enforces response size limits.
 */
async function pinnedTransport(
  url: string,
  parsed: URL,
  validatedAddresses: readonly string[],
  init?: RequestInit,
): Promise<Response> {
  const agent = createPinnedAgent(
    parsed.protocol as 'http:' | 'https:',
    validatedAddresses,
  );

  try {
    return await new Promise<Response>((resolve, reject) => {
      const mod = parsed.protocol === 'https:' ? https : http;
      const reqOptions: http.RequestOptions = {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: (init?.method ?? 'GET').toUpperCase(),
        headers: init?.headers
          ? Object.fromEntries(
              init.headers instanceof Headers
                ? init.headers.entries()
                : Array.isArray(init.headers)
                  ? init.headers
                  : Object.entries(init.headers),
            )
          : undefined,
        agent,
        signal: init?.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS),
      };

      const req = mod.request(url, reqOptions, (res) => {
        // Block redirects — prevent redirect to private IPs (DNS rebinding)
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
          res.destroy();
          reject(new Error(`Redirects are not allowed (HTTP ${res.statusCode})`));
          return;
        }

        const chunks: Buffer[] = [];
        let totalLength = 0;

        res.on('data', (chunk: Buffer) => {
          totalLength += chunk.length;
          if (totalLength > MAX_RESPONSE_SIZE) {
            res.destroy();
            reject(new Error('Response body exceeds size limit'));
            return;
          }
          chunks.push(chunk);
        });

        res.on('end', () => {
          const body = Buffer.concat(chunks);
          const headers = new Headers();
          for (const [key, val] of Object.entries(res.headers)) {
            if (val) {
              const values = Array.isArray(val) ? val : [val];
              for (const v of values) headers.append(key, v);
            }
          }

          resolve(
            new Response(body, {
              status: res.statusCode ?? 500,
              statusText: res.statusMessage ?? '',
              headers,
            }),
          );
        });

        res.on('error', reject);
      });

      req.on('error', reject);

      if (init?.body) {
        req.write(init.body);
      }
      req.end();
    });
  } finally {
    agent.destroy();
  }
}

/**
 * Fetch with DNS pinning + spec-fetch policy (no redirects, size limit).
 * Used only by fetchSpecFromUrl.
 */
async function pinnedSpecFetch(
  url: string,
  parsed: URL,
  validatedAddresses: readonly string[],
  init?: RequestInit,
): Promise<Response> {
  const agent = createPinnedAgent(
    parsed.protocol as 'http:' | 'https:',
    validatedAddresses,
  );

  try {
    return await new Promise<Response>((resolve, reject) => {
      const mod = parsed.protocol === 'https:' ? https : http;
      const reqOptions: http.RequestOptions = {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: (init?.method ?? 'GET').toUpperCase(),
        headers: init?.headers
          ? Object.fromEntries(
              init.headers instanceof Headers
                ? init.headers.entries()
                : Array.isArray(init.headers)
                  ? init.headers
                  : Object.entries(init.headers),
            )
          : undefined,
        agent,
        signal: init?.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS),
      };

      const req = mod.request(url, reqOptions, (res) => {
        // Block redirects — spec fetches must not follow redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
          res.destroy();
          reject(new Error(`Redirects are not allowed (HTTP ${res.statusCode})`));
          return;
        }

        // Collect the response body with size limit
        const chunks: Buffer[] = [];
        let totalLength = 0;

        res.on('data', (chunk: Buffer) => {
          totalLength += chunk.length;
          if (totalLength > MAX_SPEC_SIZE) {
            res.destroy();
            reject(new Error('Response body exceeds size limit'));
            return;
          }
          chunks.push(chunk);
        });

        res.on('end', () => {
          const body = Buffer.concat(chunks);
          const headers = new Headers();
          for (const [key, val] of Object.entries(res.headers)) {
            if (val) {
              const values = Array.isArray(val) ? val : [val];
              for (const v of values) headers.append(key, v);
            }
          }

          resolve(
            new Response(body, {
              status: res.statusCode ?? 500,
              statusText: res.statusMessage ?? '',
              headers,
            }),
          );
        });

        res.on('error', reject);
      });

      req.on('error', reject);

      if (init?.body) {
        req.write(init.body);
      }
      req.end();
    });
  } finally {
    agent.destroy();
  }
}

/**
 * Fetch a spec from a URL with SSRF protection.
 * Resolves DNS, validates all IPs, then connects via pinned agent
 * to prevent DNS rebinding attacks.
 */
export async function fetchSpecFromUrl(url: string): Promise<unknown> {
  const parsed = validateUrl(url);

  const addresses = await resolveAllAddresses(parsed.hostname);
  validateAddresses(addresses);

  const response = await pinnedSpecFetch(
    url,
    parsed,
    addresses,
    {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: new Headers({ Accept: 'application/json' }),
    },
  );

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
 * Validates URL, resolves DNS, checks for private IPs,
 * then uses pinned DNS to prevent rebinding.
 */
export async function safeFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const parsed = validateUrl(url);

  const addresses = await resolveAllAddresses(parsed.hostname);
  validateAddresses(addresses);

  const signal = init?.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS);

  return pinnedTransport(url, parsed, addresses, { ...init, signal });
}
