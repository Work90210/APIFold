import type { Logger } from '../observability/logger.js';
import { metrics } from '../observability/metrics.js';
import type { L0ServerMeta } from '../registry/server-registry.js';
import type { ToolDefinition } from '../registry/tool-loader.js';
import type { CircuitBreaker } from '../resilience/circuit-breaker.js';

import type { AuthInjectorDeps } from './auth-injector.js';
import { buildAuthHeaders } from './auth-injector.js';


export interface MCPToolResult {
  readonly content: readonly { readonly type: string; readonly text: string }[];
  readonly isError: boolean;
}

export interface ExecutionContext {
  readonly requestId: string;
  readonly sessionId: string;
}

export interface ToolExecutorDeps {
  readonly logger: Logger;
  readonly circuitBreaker: CircuitBreaker;
  readonly authInjector: AuthInjectorDeps;
  readonly timeoutMs: number;
}

export async function executeTool(
  deps: ToolExecutorDeps,
  server: L0ServerMeta,
  tool: ToolDefinition,
  input: Readonly<Record<string, unknown>>,
  context: ExecutionContext,
): Promise<MCPToolResult> {
  const { logger, circuitBreaker, authInjector, timeoutMs } = deps;

  if (circuitBreaker.isOpen(server.id)) {
    logger.warn({ serverId: server.id, slug: server.slug, requestId: context.requestId }, 'Circuit open');
    return errorResult('CIRCUIT_OPEN', 'Upstream API temporarily unavailable');
  }

  const url = buildUpstreamUrl(server.baseUrl, tool.name);
  const headers = await buildAuthHeaders(authInjector, server.id, server.authMode);

  const allHeaders: Record<string, string> = {
    ...headers,
    'Content-Type': 'application/json',
    'X-Request-ID': context.requestId,
  };

  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: allHeaders,
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const latencyMs = Math.round(performance.now() - startTime);

    // 5xx = upstream failure → record for circuit breaker; 4xx = client error → success
    if (response.status >= 500) {
      circuitBreaker.recordFailure(server.id);
    } else {
      circuitBreaker.recordSuccess(server.id);
    }

    metrics.incrementCounter('tool_executions_total', {
      server: server.slug,
      tool: tool.name,
      status: String(response.status),
    });
    metrics.observeHistogram('tool_execution_duration_ms', latencyMs, {
      server: server.slug,
    });

    const body = await readResponseWithLimit(response, MAX_RESPONSE_BYTES);

    logger.info(
      { requestId: context.requestId, tool: tool.name, status: response.status, latencyMs },
      'Tool execution completed',
    );

    return Object.freeze({
      content: [{ type: 'text', text: body }],
      isError: !response.ok,
    });
  } catch (err) {
    const latencyMs = Math.round(performance.now() - startTime);
    circuitBreaker.recordFailure(server.id);

    metrics.incrementCounter('tool_executions_total', {
      server: server.slug,
      tool: tool.name,
      status: 'error',
    });

    logger.error(
      { requestId: context.requestId, tool: tool.name, err, latencyMs },
      'Tool execution failed',
    );

    return errorResult('UPSTREAM_ERROR', 'Upstream API request failed');
  }
}

const MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10 MB

function buildUpstreamUrl(baseUrl: string, toolName: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${base}/tools/${encodeURIComponent(toolName)}`;
}

async function readResponseWithLimit(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    return response.text();
  }

  const chunks: Uint8Array[] = [];
  let totalSize = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    totalSize += value.byteLength;
    if (totalSize > maxBytes) {
      reader.cancel();
      throw new Error(`Response body exceeded ${maxBytes} bytes`);
    }
    chunks.push(value);
  }

  const decoder = new TextDecoder();
  return chunks.map((c) => decoder.decode(c, { stream: true })).join('') + decoder.decode();
}

function errorResult(code: string, message: string): MCPToolResult {
  return Object.freeze({
    content: [{ type: 'text', text: JSON.stringify({ error: code, message }) }],
    isError: true,
  });
}
