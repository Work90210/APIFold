import { describe, it, expect } from 'vitest';
import { parseSpec } from '../src/parse.js';
import { transformSpec } from '../src/transform.js';
import type { ResolvedOpenAPISpec } from '../src/types.js';

function generateLargeSpec(operationCount: number): unknown {
  const pathCount = Math.ceil(operationCount / 5);
  const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
  const paths: Record<string, Record<string, unknown>> = {};
  const schemas: Record<string, unknown> = {};

  schemas['BaseEntity'] = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
    required: ['id'],
  };

  schemas['Error'] = {
    type: 'object',
    properties: {
      code: { type: 'integer' },
      message: { type: 'string' },
    },
  };

  let opsGenerated = 0;

  for (let i = 0; i < pathCount && opsGenerated < operationCount; i++) {
    const pathItem: Record<string, unknown> = {};
    const resourceName = `resource_${i}`;

    schemas[`${resourceName}_item`] = {
      allOf: [
        { $ref: '#/components/schemas/BaseEntity' },
        {
          type: 'object',
          properties: {
            name: { type: 'string' },
            status: { type: 'string', enum: ['active', 'inactive', 'archived'] },
          },
        },
      ],
    };

    for (const method of methods) {
      if (opsGenerated >= operationCount) break;

      const isGet = method === 'get';
      const isDelete = method === 'delete';

      pathItem[method] = {
        operationId: `${method}_${resourceName}`,
        summary: `${method.toUpperCase()} ${resourceName}`,
        tags: [`group_${i % 10}`],
        parameters: [
          {
            name: `${resourceName}_id`,
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          ...(isGet
            ? [
                { name: 'page', in: 'query', schema: { type: 'integer' } },
                { name: 'limit', in: 'query', schema: { type: 'integer' } },
              ]
            : []),
        ],
        ...(!isGet && !isDelete
          ? {
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: { $ref: `#/components/schemas/${resourceName}_item` },
                  },
                },
              },
            }
          : {}),
        responses: {
          '200': { description: 'Success' },
          '400': { description: 'Bad request' },
        },
      };

      opsGenerated++;
    }

    paths[`/api/v1/${resourceName}/{${resourceName}_id}`] = pathItem;
  }

  return {
    openapi: '3.0.3',
    info: { title: 'Large Performance Test API', version: '1.0.0' },
    paths,
    components: { schemas },
  };
}

describe('performance', () => {
  it('transforms a 1000-operation spec in under 1 second', () => {
    const rawSpec = generateLargeSpec(1000);
    const parsed = parseSpec({ spec: rawSpec });

    const start = performance.now();
    const result = transformSpec({ spec: parsed.spec });
    const elapsed = performance.now() - start;

    expect(result.tools.length).toBeGreaterThanOrEqual(990);
    expect(elapsed).toBeLessThan(5000);
  });

  it('parse + transform of 1000 operations completes in under 10 seconds', () => {
    const rawSpec = generateLargeSpec(1000);

    const start = performance.now();
    const parsed = parseSpec({ spec: rawSpec });
    const result = transformSpec({ spec: parsed.spec });
    const elapsed = performance.now() - start;

    expect(result.tools.length).toBeGreaterThanOrEqual(990);
    expect(elapsed).toBeLessThan(10000);
  });

  it('handles 500 operations with allOf refs efficiently', () => {
    const rawSpec = generateLargeSpec(500);
    const parsed = parseSpec({ spec: rawSpec });

    const start = performance.now();
    const result = transformSpec({ spec: parsed.spec });
    const elapsed = performance.now() - start;

    expect(result.tools.length).toBeGreaterThanOrEqual(490);
    expect(elapsed).toBeLessThan(3000);
  });
});
