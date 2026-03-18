import type { ParseWarning } from './types.js';
import { ResolveError } from './errors.js';
import { MAX_DEPTH, FORBIDDEN_KEYS } from './constants.js';

const MAX_RESOLUTIONS = 1000;
const MAX_ARRAY_ITEMS = 10_000;
const MAX_OBJECT_KEYS = 10_000;

interface ResolveContext {
  readonly root: Record<string, unknown>;
  readonly visited: Set<string>;
  readonly resolved: Map<string, unknown>;
  readonly warnings: ParseWarning[];
  resolutionCount: number;
}

export function resolveRefs(
  spec: unknown,
): { readonly resolved: unknown; readonly warnings: readonly ParseWarning[] } {
  if (spec === null || spec === undefined) {
    throw new ResolveError('Cannot resolve refs on null or undefined input');
  }

  if (!isObject(spec)) {
    return { resolved: spec, warnings: [] };
  }

  const context: ResolveContext = {
    root: spec as Record<string, unknown>,
    visited: new Set(),
    resolved: new Map(),
    warnings: [],
    resolutionCount: 0,
  };

  const resolved = resolveNode(spec, context, 0);
  return { resolved, warnings: context.warnings };
}

function resolveNode(node: unknown, context: ResolveContext, depth: number): unknown {
  if (depth > MAX_DEPTH) {
    context.warnings.push({
      code: 'MAX_DEPTH_EXCEEDED',
      message: 'Spec nesting too deep; truncated',
    });
    return {};
  }

  if (Array.isArray(node)) {
    const items = node.length > MAX_ARRAY_ITEMS ? node.slice(0, MAX_ARRAY_ITEMS) : node;
    if (node.length > MAX_ARRAY_ITEMS) {
      context.warnings.push({
        code: 'ARRAY_TOO_LARGE',
        message: `Array with ${node.length} items truncated to ${MAX_ARRAY_ITEMS}`,
      });
    }
    return items.map((item) => resolveNode(item, context, depth + 1));
  }

  if (!isObject(node)) {
    return node;
  }

  const obj = node as Record<string, unknown>;
  const ref = obj['$ref'];

  if (typeof ref === 'string') {
    return resolveRef(ref, context, depth);
  }

  const entries = Object.entries(obj);
  const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;

  for (const [key, value] of entries.slice(0, MAX_OBJECT_KEYS)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    result[key] = resolveNode(value, context, depth + 1);
  }

  if (entries.length > MAX_OBJECT_KEYS) {
    context.warnings.push({
      code: 'OBJECT_TOO_LARGE',
      message: `Object with ${entries.length} keys truncated to ${MAX_OBJECT_KEYS}`,
    });
  }

  return result;
}

function resolveRef(ref: string, context: ResolveContext, depth: number): unknown {
  if (context.visited.has(ref)) {
    context.warnings.push({
      code: 'CIRCULAR_REF',
      message: `Circular $ref detected: ${truncateForWarning(ref)}`,
      path: ref,
    });
    return { type: 'object' };
  }

  if (context.resolutionCount >= MAX_RESOLUTIONS) {
    context.warnings.push({
      code: 'MAX_RESOLUTIONS_EXCEEDED',
      message: '$ref resolution limit reached',
    });
    return { type: 'object' };
  }
  context.resolutionCount++;

  if (context.resolved.has(ref)) {
    return context.resolved.get(ref);
  }

  const resolved = lookupRef(ref, context.root);
  if (resolved === undefined) {
    context.warnings.push({
      code: 'UNRESOLVED_REF',
      message: `Could not resolve $ref: ${truncateForWarning(ref)}`,
      path: ref,
    });
    return { type: 'object' };
  }

  context.visited.add(ref);
  const result = resolveNode(resolved, context, depth + 1);
  context.visited.delete(ref);

  context.resolved.set(ref, result);
  return result;
}

function lookupRef(ref: string, root: Record<string, unknown>): unknown {
  if (!ref.startsWith('#/')) {
    return undefined;
  }

  const path = ref.slice(2).split('/');
  let current: unknown = root;

  for (const segment of path) {
    if (FORBIDDEN_KEYS.has(segment)) {
      return undefined;
    }
    if (!isObject(current)) {
      return undefined;
    }
    if (!Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function truncateForWarning(s: string, max = 256): string {
  return s.length > max ? `${s.slice(0, max)}...` : s;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
