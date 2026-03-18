import { describe, it, expect } from 'vitest';
import { transformSpec } from '../src/transform.js';
import type { ResolvedOpenAPISpec } from '../src/types.js';

function makeSpec(paths: Record<string, unknown>): ResolvedOpenAPISpec {
  return {
    openapi: '3.0.3',
    info: { title: 'Test API', version: '1.0.0' },
    paths: paths as ResolvedOpenAPISpec['paths'],
  };
}

describe('transformSpec', () => {
  it('transforms a simple GET operation', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/pets': {
          get: {
            operationId: 'listPets',
            summary: 'List all pets',
          },
        },
      }),
    });

    expect(result.tools).toHaveLength(1);
    expect(result.tools[0]!.name).toBe('listpets');
    expect(result.tools[0]!.description).toBe('List all pets');
    expect(result.tools[0]!._meta.method).toBe('get');
    expect(result.tools[0]!._meta.pathTemplate).toBe('/pets');
  });

  it('handles path parameters', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/pets/{petId}': {
          get: {
            operationId: 'getPet',
            summary: 'Get a pet',
            parameters: [
              { name: 'petId', in: 'path', required: true, schema: { type: 'string' } },
            ],
          },
        },
      }),
    });

    const tool = result.tools[0]!;
    expect(tool.inputSchema.properties['petId']).toEqual({ type: 'string' });
    expect(tool.inputSchema.required).toContain('petId');
    expect(tool._meta.paramMap['petId']).toBe('path');
  });

  it('handles query parameters', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/pets': {
          get: {
            operationId: 'listPets',
            summary: 'List pets',
            parameters: [
              { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } },
            ],
          },
        },
      }),
    });

    const tool = result.tools[0]!;
    expect(tool.inputSchema.properties['limit']).toEqual({ type: 'integer' });
    expect(tool.inputSchema.required).not.toContain('limit');
    expect(tool._meta.paramMap['limit']).toBe('query');
  });

  it('skips Authorization and Content-Type headers', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/pets': {
          get: {
            operationId: 'listPets',
            summary: 'List pets',
            parameters: [
              { name: 'Authorization', in: 'header', schema: { type: 'string' } },
              { name: 'Content-Type', in: 'header', schema: { type: 'string' } },
              { name: 'X-Custom', in: 'header', schema: { type: 'string' } },
            ],
          },
        },
      }),
    });

    const tool = result.tools[0]!;
    expect(tool.inputSchema.properties['Authorization']).toBeUndefined();
    expect(tool.inputSchema.properties['Content-Type']).toBeUndefined();
    expect(tool.inputSchema.properties['X-Custom']).toBeDefined();
  });

  it('handles JSON request body', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/pets': {
          post: {
            operationId: 'createPet',
            summary: 'Create a pet',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { name: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      }),
    });

    const tool = result.tools[0]!;
    expect(tool.inputSchema.properties['body']).toBeDefined();
    expect(tool.inputSchema.required).toContain('body');
  });

  it('handles form-urlencoded request body', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/login': {
          post: {
            operationId: 'login',
            summary: 'Login',
            requestBody: {
              content: {
                'application/x-www-form-urlencoded': {
                  schema: {
                    type: 'object',
                    properties: { username: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      }),
    });

    const tool = result.tools[0]!;
    expect(tool.inputSchema.properties['body']).toBeDefined();
  });

  it('generates name from method+path when operationId missing', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/pets': {
          get: { summary: 'List pets' },
        },
      }),
    });

    expect(result.tools[0]!.name).toBe('get_pets');
    expect(result.warnings.some((w) => w.code === 'MISSING_OPERATION_ID')).toBe(true);
  });

  it('skips deprecated operations by default', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/pets': {
          get: { operationId: 'listPets', summary: 'List pets', deprecated: true },
        },
      }),
    });

    expect(result.tools).toHaveLength(0);
    expect(result.metadata.skippedReasons.get('listPets')).toBe('deprecated');
  });

  it('includes deprecated operations when configured', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/pets': {
          get: { operationId: 'listPets', summary: 'List pets', deprecated: true },
        },
      }),
      includeDeprecated: true,
    });

    expect(result.tools).toHaveLength(1);
    expect(result.tools[0]!._meta.deprecated).toBe(true);
  });

  it('skips binary/multipart request bodies', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/upload': {
          post: {
            operationId: 'uploadFile',
            summary: 'Upload',
            requestBody: {
              content: {
                'multipart/form-data': { schema: { type: 'object' } },
              },
            },
          },
        },
      }),
    });

    expect(result.tools).toHaveLength(0);
    expect(result.warnings.some((w) => w.code === 'UNSUPPORTED_BODY')).toBe(true);
  });

  it('filters by methods', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/pets': {
          get: { operationId: 'listPets', summary: 'List' },
          post: { operationId: 'createPet', summary: 'Create' },
        },
      }),
      filterMethods: ['get'],
    });

    expect(result.tools).toHaveLength(1);
    expect(result.tools[0]!.name).toBe('listpets');
  });

  it('filters by tags', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/pets': {
          get: { operationId: 'listPets', summary: 'List', tags: ['pets'] },
        },
        '/users': {
          get: { operationId: 'listUsers', summary: 'List users', tags: ['users'] },
        },
      }),
      filterTags: ['pets'],
    });

    expect(result.tools).toHaveLength(1);
    expect(result.tools[0]!.name).toBe('listpets');
  });

  it('filters by path patterns', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/pets': {
          get: { operationId: 'listPets', summary: 'List' },
        },
        '/users': {
          get: { operationId: 'listUsers', summary: 'List' },
        },
      }),
      filterPaths: ['/pets*'],
    });

    expect(result.tools).toHaveLength(1);
    expect(result.tools[0]!.name).toBe('listpets');
  });

  it('deduplicates tool names', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/v1/pets': {
          get: { operationId: 'listPets', summary: 'List v1' },
        },
        '/v2/pets': {
          get: { operationId: 'listPets', summary: 'List v2' },
        },
      }),
    });

    const names = result.tools.map((t) => t.name);
    expect(names).toContain('listpets');
    expect(names).toContain('listpets_2');
  });

  it('uses method_path strategy when configured', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/pets': {
          get: { operationId: 'listPets', summary: 'List' },
        },
      }),
      nameStrategy: 'method_path',
    });

    expect(result.tools[0]!.name).toBe('get_pets');
  });

  it('does not emit MISSING_OPERATION_ID when strategy is method_path', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/pets': {
          get: { summary: 'List' },
        },
      }),
      nameStrategy: 'method_path',
    });

    expect(result.warnings.some((w) => w.code === 'MISSING_OPERATION_ID')).toBe(false);
  });

  it('falls back to method_path when operationId sanitizes to empty', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/pets': {
          get: { operationId: '!!!', summary: 'List' },
        },
      }),
    });

    expect(result.tools[0]!.name).toBe('get_pets');
    expect(result.warnings.some((w) => w.code === 'INVALID_OPERATION_ID')).toBe(true);
  });

  it('handles empty paths', () => {
    const result = transformSpec({
      spec: makeSpec({}),
    });

    expect(result.tools).toHaveLength(0);
    expect(result.metadata.totalOperations).toBe(0);
  });

  it('falls back description to description field', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/pets': {
          get: { operationId: 'listPets', description: 'Full description' },
        },
      }),
    });

    expect(result.tools[0]!.description).toBe('Full description');
  });

  it('generates description from method+path as last resort', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/pets': {
          get: { operationId: 'listPets' },
        },
      }),
    });

    expect(result.tools[0]!.description).toBe('GET /pets');
  });

  it('populates metadata correctly', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/pets': {
          get: { operationId: 'listPets', summary: 'List' },
          post: { operationId: 'createPet', summary: 'Create' },
        },
      }),
    });

    expect(result.metadata.specTitle).toBe('Test API');
    expect(result.metadata.specVersion).toBe('1.0.0');
    expect(result.metadata.openApiVersion).toBe('3.0');
    expect(result.metadata.totalOperations).toBe(2);
    expect(result.metadata.transformedCount).toBe(2);
    expect(result.metadata.skippedCount).toBe(0);
  });

  it('merges path-level and operation-level parameters', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/orgs/{orgId}/repos': {
          parameters: [
            { name: 'orgId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          get: {
            operationId: 'listRepos',
            summary: 'List repos',
            parameters: [
              { name: 'page', in: 'query', schema: { type: 'integer' } },
            ],
          },
        },
      }),
    });

    const tool = result.tools[0]!;
    expect(tool.inputSchema.properties['orgId']).toBeDefined();
    expect(tool.inputSchema.properties['page']).toBeDefined();
    expect(tool.inputSchema.required).toContain('orgId');
  });

  it('sanitizes reserved param names', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/test': {
          post: {
            operationId: 'test',
            summary: 'Test',
            parameters: [
              { name: 'body', in: 'query', schema: { type: 'string' } },
            ],
          },
        },
      }),
    });

    const tool = result.tools[0]!;
    expect(tool.inputSchema.properties['param_body']).toBeDefined();
  });

  it('deduplicates sanitized param names within an operation', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/test': {
          post: {
            operationId: 'test',
            summary: 'Test',
            parameters: [
              { name: 'body', in: 'query', schema: { type: 'string' } },
              { name: 'param_body', in: 'query', schema: { type: 'string' } },
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { data: { type: 'string' } } },
                },
              },
            },
          },
        },
      }),
    });

    const tool = result.tools[0]!;
    // 'body' param renamed to 'param_body', which collides with existing 'param_body'
    // so it gets further renamed to 'param_body_2'
    const propNames = Object.keys(tool.inputSchema.properties);
    expect(new Set(propNames).size).toBe(propNames.length);
    expect(propNames).toContain('body');
    expect(propNames).toContain('param_body');
    expect(propNames).toContain('param_body_2');
  });

  it('handles requestBody with unrecognized media type (no body produced)', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/xml': {
          post: {
            operationId: 'sendXml',
            summary: 'Send XML',
            requestBody: {
              required: true,
              content: {
                'application/xml': {
                  schema: { type: 'string' },
                },
              },
            },
          },
        },
      }),
    });

    const tool = result.tools[0]!;
    expect(tool.inputSchema.properties['body']).toBeUndefined();
  });

  it('handles parameter with no schema (defaults to string)', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/test': {
          get: {
            operationId: 'test',
            summary: 'Test',
            parameters: [
              { name: 'q', in: 'query' },
            ],
          },
        },
      }),
    });

    const tool = result.tools[0]!;
    expect(tool.inputSchema.properties['q']).toEqual({ type: 'string' });
  });

  it('throws TransformError when filterPaths pattern exceeds 256 chars', () => {
    expect(() =>
      transformSpec({
        spec: makeSpec({ '/test': { get: { operationId: 'test', summary: 'Test' } } }),
        filterPaths: ['/' + 'a'.repeat(257)],
      }),
    ).toThrow('filterPaths pattern exceeds');
  });

  it('handles glob ** wildcard in filterPaths', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/api/v1/pets': { get: { operationId: 'listPets', summary: 'List' } },
        '/api/v2/users': { get: { operationId: 'listUsers', summary: 'List' } },
        '/other': { get: { operationId: 'other', summary: 'Other' } },
      }),
      filterPaths: ['/api/**'],
    });

    expect(result.tools).toHaveLength(2);
  });

  it('handles glob ? wildcard in filterPaths', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/v1/pets': { get: { operationId: 'v1Pets', summary: 'V1' } },
        '/v2/pets': { get: { operationId: 'v2Pets', summary: 'V2' } },
        '/v10/pets': { get: { operationId: 'v10Pets', summary: 'V10' } },
      }),
      filterPaths: ['/v?/pets'],
    });

    expect(result.tools).toHaveLength(2);
    const names = result.tools.map((t) => t.name);
    expect(names).toContain('v1pets');
    expect(names).toContain('v2pets');
  });

  it('skippedCount is accurate with filterMethods', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/pets': {
          get: { operationId: 'listPets', summary: 'List' },
          post: { operationId: 'createPet', summary: 'Create' },
          delete: { operationId: 'deletePets', summary: 'Delete', deprecated: true },
        },
      }),
      filterMethods: ['get', 'delete'],
    });

    // get passes, post filtered out (not counted), delete is deprecated (skipped)
    expect(result.metadata.totalOperations).toBe(2);
    expect(result.metadata.transformedCount).toBe(1);
    expect(result.metadata.skippedCount).toBe(1);
  });

  it('skips cookie parameters', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/test': {
          get: {
            operationId: 'test',
            summary: 'Test',
            parameters: [
              { name: 'session', in: 'cookie', schema: { type: 'string' } },
              { name: 'q', in: 'query', schema: { type: 'string' } },
            ],
          },
        },
      }),
    });

    const tool = result.tools[0]!;
    expect(tool.inputSchema.properties['session']).toBeUndefined();
    expect(tool.inputSchema.properties['q']).toBeDefined();
  });

  it('skips octet-stream only request bodies', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/upload': {
          post: {
            operationId: 'upload',
            summary: 'Upload',
            requestBody: {
              content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } },
            },
          },
        },
      }),
    });

    expect(result.tools).toHaveLength(0);
    expect(result.warnings.some((w) => w.code === 'UNSUPPORTED_BODY')).toBe(true);
  });

  it('does not skip mixed binary+non-binary request body', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/mixed': {
          post: {
            operationId: 'mixed',
            summary: 'Mixed',
            requestBody: {
              content: {
                'application/json': { schema: { type: 'object' } },
                'multipart/form-data': { schema: { type: 'object' } },
              },
            },
          },
        },
      }),
    });

    expect(result.tools).toHaveLength(1);
  });

  it('optional requestBody body is not in required', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/test': {
          post: {
            operationId: 'test',
            summary: 'Test',
            requestBody: {
              required: false,
              content: {
                'application/json': { schema: { type: 'object' } },
              },
            },
          },
        },
      }),
    });

    const tool = result.tools[0]!;
    expect(tool.inputSchema.properties['body']).toBeDefined();
    expect(tool.inputSchema.required).not.toContain('body');
  });

  it('operation-level param overrides path-level param with same name', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/test': {
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'path-level' },
          ],
          get: {
            operationId: 'test',
            summary: 'Test',
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'op-level' },
            ],
          },
        },
      }),
    });

    const tool = result.tools[0]!;
    expect(tool.inputSchema.properties['id']).toEqual({ type: 'integer', description: 'op-level' });
  });

  it('empty filterTags array does not filter anything', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/pets': {
          get: { operationId: 'listPets', summary: 'List', tags: ['pets'] },
        },
      }),
      filterTags: [],
    });

    expect(result.tools).toHaveLength(1);
  });

  it('includes parameter descriptions in schema', () => {
    const result = transformSpec({
      spec: makeSpec({
        '/pets': {
          get: {
            operationId: 'listPets',
            summary: 'List',
            parameters: [
              {
                name: 'limit',
                in: 'query',
                description: 'Max items to return',
                schema: { type: 'integer' },
              },
            ],
          },
        },
      }),
    });

    const tool = result.tools[0]!;
    expect(tool.inputSchema.properties['limit']).toEqual({
      type: 'integer',
      description: 'Max items to return',
    });
  });
});
