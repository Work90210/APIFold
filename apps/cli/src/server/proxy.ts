import type { MCPToolDefinition } from '@apifold/transformer';
import type { CliConfig } from '../config/schema.js';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

function validateUpstreamUrl(url: URL): void {
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new Error(`Unsupported protocol: ${url.protocol} — only HTTP/HTTPS allowed`);
  }
}

export interface ProxyResult {
  readonly status: number;
  readonly body: unknown;
  readonly contentType: string | null;
}

export async function proxyToolCall(
  tool: MCPToolDefinition,
  args: Readonly<Record<string, unknown>>,
  config: CliConfig,
): Promise<ProxyResult> {
  const meta = tool._meta;
  if (!meta) {
    throw new Error(`Tool "${tool.name}" is missing _meta — cannot proxy`);
  }

  const { method, pathTemplate, paramMap } = meta;
  const baseUrl = (config.baseUrl ?? '').replace(/\/$/, '');

  if (!baseUrl) {
    throw new Error('baseUrl is required for proxying upstream API calls');
  }

  let urlPath = pathTemplate;
  const queryParams = new URLSearchParams();
  const headers = new Headers();
  let bodyPayload: Record<string, unknown> | undefined;

  // Route each argument to its correct HTTP location based on paramMap
  for (const [paramName, paramValue] of Object.entries(args)) {
    if (paramName === 'body') {
      // The 'body' key is always the request body object
      bodyPayload = paramValue as Record<string, unknown>;
      continue;
    }

    const location = paramMap[paramName];
    const valueStr = String(paramValue);

    switch (location) {
      case 'path':
        urlPath = urlPath.replaceAll(`{${paramName}}`, encodeURIComponent(valueStr));
        break;
      case 'query':
        queryParams.append(paramName, valueStr);
        break;
      case 'header':
        headers.set(paramName, valueStr);
        break;
      default:
        // Unmapped params — send as query for GET, body for mutations
        if (method === 'get' || method === 'head') {
          queryParams.append(paramName, valueStr);
        } else {
          bodyPayload = { ...(bodyPayload ?? {}), [paramName]: paramValue };
        }
    }
  }

  // Inject auth headers AFTER the param loop so configured auth always takes
  // precedence over any 'header' params from the OpenAPI spec (prevents an
  // adversarial spec from overriding the user's auth header).
  injectAuth(headers, config);

  const url = new URL(`${baseUrl}${urlPath}`);
  validateUpstreamUrl(url);
  const qs = queryParams.toString();
  if (qs) {
    url.search = qs;
  }

  const hasBody = bodyPayload !== undefined && Object.keys(bodyPayload).length > 0;
  if (hasBody) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let response: globalThis.Response;
  try {
    response = await fetch(url, {
      method: method.toUpperCase(),
      headers,
      body: hasBody ? JSON.stringify(bodyPayload) : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const contentType = response.headers.get('content-type');
  const body = contentType?.includes('application/json')
    ? await response.json()
    : await response.text();

  return Object.freeze({ status: response.status, body, contentType });
}

function injectAuth(headers: Headers, config: CliConfig): void {
  const { auth } = config;

  switch (auth.type) {
    case 'bearer':
      if (auth.token) {
        headers.set('Authorization', `Bearer ${auth.token}`);
      }
      break;
    case 'api_key':
      if (auth.header && auth.token) {
        headers.set(auth.header, auth.token);
      }
      break;
    case 'none':
      break;
  }
}
