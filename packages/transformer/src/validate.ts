import type { ParseWarning, ResolvedOpenAPISpec } from './types.js';
import { ValidationError } from './errors.js';

export function validateSpec(spec: unknown): {
  readonly warnings: readonly ParseWarning[];
} {
  if (!isObject(spec)) {
    throw new ValidationError('Spec must be a non-null object');
  }

  const obj = spec as Record<string, unknown>;
  const warnings: ParseWarning[] = [];

  if (!obj['openapi'] || typeof obj['openapi'] !== 'string') {
    throw new ValidationError('Missing or invalid "openapi" field');
  }

  const version = obj['openapi'] as string;
  if (!version.startsWith('3.0') && !version.startsWith('3.1')) {
    const truncated = version.length > 64 ? `${version.slice(0, 64)}...` : version;
    throw new ValidationError(
      `Unsupported OpenAPI version: ${truncated}. Only 3.0.x and 3.1.x are supported.`,
    );
  }

  if (!obj['info'] || !isObject(obj['info'])) {
    throw new ValidationError('Missing or invalid "info" field');
  }

  const info = obj['info'] as Record<string, unknown>;
  if (!info['title'] || typeof info['title'] !== 'string') {
    throw new ValidationError('Missing or invalid "info.title" field');
  }

  if (!info['version'] || typeof info['version'] !== 'string') {
    throw new ValidationError('Missing or invalid "info.version" field');
  }

  if (!obj['paths'] || !isObject(obj['paths'])) {
    warnings.push({
      code: 'MISSING_PATHS',
      message: 'Spec has no "paths" field; no operations to transform',
    });
  } else {
    const paths = obj['paths'] as Record<string, unknown>;
    if (Object.keys(paths).length === 0) {
      warnings.push({
        code: 'EMPTY_PATHS',
        message: 'Spec has empty "paths" object; no operations to transform',
      });
    }
  }

  return { warnings };
}

export function detectVersion(spec: ResolvedOpenAPISpec): '3.0' | '3.1' {
  return spec.openapi.startsWith('3.1') ? '3.1' : '3.0';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
