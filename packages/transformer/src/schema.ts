import type { JSONSchema } from './types.js';
import { MAX_DEPTH, FORBIDDEN_KEYS } from './constants.js';

const MAX_COMPOSITION_ITEMS = 100;

export function mergeAllOf(schemas: readonly JSONSchema[]): JSONSchema {
  let mergedProperties: Record<string, unknown> = {};
  const mergedRequiredSet = new Set<string>();
  let mergedType: unknown = 'object';
  let rest: Record<string, unknown> = {};

  for (const schema of schemas) {
    const properties = schema['properties'] as Record<string, unknown> | undefined;
    if (properties) {
      for (const [k, v] of Object.entries(properties)) {
        if (!FORBIDDEN_KEYS.has(k)) {
          mergedProperties = { ...mergedProperties, [k]: v };
        }
      }
    }

    const required = schema['required'] as string[] | undefined;
    if (required) {
      for (const r of required) {
        mergedRequiredSet.add(r);
      }
    }

    if (schema['type'] !== undefined) {
      mergedType = schema['type'];
    }

    for (const [key, value] of Object.entries(schema)) {
      if (FORBIDDEN_KEYS.has(key)) continue;
      if (key !== 'properties' && key !== 'required' && key !== 'type' && key !== 'allOf') {
        rest = { ...rest, [key]: value };
      }
    }
  }

  return {
    ...rest,
    type: mergedType,
    ...(Object.keys(mergedProperties).length > 0 ? { properties: mergedProperties } : {}),
    ...(mergedRequiredSet.size > 0 ? { required: [...mergedRequiredSet] } : {}),
  } as JSONSchema;
}

export function flattenSchema(schema: JSONSchema, depth = 0): JSONSchema {
  if (depth > MAX_DEPTH) {
    return schema;
  }

  const allOf = schema['allOf'] as JSONSchema[] | undefined;
  if (allOf && Array.isArray(allOf)) {
    const bounded = allOf.slice(0, MAX_COMPOSITION_ITEMS);
    const flattened = bounded.map((s) => flattenSchema(s, depth + 1));
    const { allOf: _removed, ...rest } = schema as Record<string, unknown>;
    return mergeAllOf([rest as JSONSchema, ...flattened]);
  }

  const oneOf = schema['oneOf'] as JSONSchema[] | undefined;
  if (oneOf && Array.isArray(oneOf)) {
    const bounded = oneOf.slice(0, MAX_COMPOSITION_ITEMS);
    return {
      ...schema,
      oneOf: bounded.map((s) => flattenSchema(s, depth + 1)),
    } as JSONSchema;
  }

  const anyOf = schema['anyOf'] as JSONSchema[] | undefined;
  if (anyOf && Array.isArray(anyOf)) {
    const bounded = anyOf.slice(0, MAX_COMPOSITION_ITEMS);
    return {
      ...schema,
      anyOf: bounded.map((s) => flattenSchema(s, depth + 1)),
    } as JSONSchema;
  }

  return schema;
}
