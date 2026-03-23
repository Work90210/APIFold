import type { BaseEvent } from './base-event.js';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface RequestLog extends BaseEvent {
  readonly requestId: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly requestBody?: Record<string, unknown> | null;
  readonly responseBody?: string | null;
  readonly requestHeaders?: Record<string, string> | null;
  readonly errorMessage?: string | null;
  readonly toolName?: string | null;
}

export interface CreateRequestLogInput {
  readonly serverId: string;
  readonly toolId?: string | null;
  readonly requestId: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly statusCode: number;
  readonly durationMs: number;
  readonly requestBody?: Record<string, unknown> | null;
  readonly responseBody?: string | null;
  readonly requestHeaders?: Record<string, string> | null;
  readonly errorMessage?: string | null;
  readonly toolName?: string | null;
}
