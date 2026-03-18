import { describe, it, expect } from 'vitest';
import { resolveRefs } from '../src/resolve.js';
import { ResolveError } from '../src/errors.js';

describe('resolveRefs', () => {
  it('resolves a simple $ref', () => {
    const spec = {
      components: {
        schemas: {
          Pet: { type: 'object', properties: { name: { type: 'string' } } },
        },
      },
      paths: {
        '/pets': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Pet' },
                  },
                },
              },
            },
          },
        },
      },
    };

    const { resolved, warnings } = resolveRefs(spec);
    const schema = (resolved as any).paths['/pets'].get.responses['200'].content['application/json'].schema;
    expect(schema).toEqual({ type: 'object', properties: { name: { type: 'string' } } });
    expect(warnings).toHaveLength(0);
  });

  it('detects circular refs and breaks the cycle', () => {
    const spec = {
      components: {
        schemas: {
          Node: {
            type: 'object',
            properties: {
              child: { $ref: '#/components/schemas/Node' },
            },
          },
        },
      },
      paths: {
        '/nodes': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Node' },
                  },
                },
              },
            },
          },
        },
      },
    };

    const { resolved, warnings } = resolveRefs(spec);
    expect(warnings.some((w) => w.code === 'CIRCULAR_REF')).toBe(true);
    const nodeSchema = (resolved as any).components.schemas.Node;
    // The circular ref is broken at the second level of recursion
    expect(nodeSchema.type).toBe('object');
    expect(nodeSchema.properties.child.type).toBe('object');
    expect(nodeSchema.properties.child.properties.child).toEqual({ type: 'object' });
  });

  it('warns on unresolved refs', () => {
    const spec = {
      paths: {
        '/pets': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/NonExistent' },
                  },
                },
              },
            },
          },
        },
      },
    };

    const { warnings } = resolveRefs(spec);
    expect(warnings.some((w) => w.code === 'UNRESOLVED_REF')).toBe(true);
  });

  it('resolves nested refs', () => {
    const spec = {
      components: {
        schemas: {
          Name: { type: 'string' },
          Pet: {
            type: 'object',
            properties: {
              name: { $ref: '#/components/schemas/Name' },
            },
          },
        },
      },
      test: { $ref: '#/components/schemas/Pet' },
    };

    const { resolved, warnings } = resolveRefs(spec);
    expect((resolved as any).test).toEqual({
      type: 'object',
      properties: { name: { type: 'string' } },
    });
    expect(warnings).toHaveLength(0);
  });

  it('warns on external (non-local) refs', () => {
    const spec = {
      test: { $ref: 'https://example.com/schema.json#/Foo' },
    };
    const { warnings } = resolveRefs(spec);
    expect(warnings.some((w) => w.code === 'UNRESOLVED_REF')).toBe(true);
  });

  it('handles ref pointing to non-existent hasOwnProperty path', () => {
    const spec = {
      components: { schemas: {} },
      test: { $ref: '#/components/schemas/Missing' },
    };
    const { warnings } = resolveRefs(spec);
    expect(warnings.some((w) => w.code === 'UNRESOLVED_REF')).toBe(true);
  });

  it('throws ResolveError on null input', () => {
    expect(() => resolveRefs(null)).toThrow(ResolveError);
  });

  it('throws ResolveError on undefined input', () => {
    expect(() => resolveRefs(undefined)).toThrow(ResolveError);
  });

  it('handles non-object input', () => {
    const { resolved, warnings } = resolveRefs('not an object');
    expect(resolved).toBe('not an object');
    expect(warnings).toHaveLength(0);
  });

  it('rejects __proto__ in $ref path segments', () => {
    const spec = {
      components: { schemas: { Safe: { type: 'string' } } },
      test: { $ref: '#/__proto__/polluted' },
    };
    const { resolved, warnings } = resolveRefs(spec);
    expect(warnings.some((w) => w.code === 'UNRESOLVED_REF')).toBe(true);
    expect((resolved as any).test).toEqual({ type: 'object' });
  });

  it('rejects constructor in $ref path segments', () => {
    const spec = { test: { $ref: '#/constructor/prototype' } };
    const { warnings } = resolveRefs(spec);
    expect(warnings.some((w) => w.code === 'UNRESOLVED_REF')).toBe(true);
  });

  it('skips __proto__ keys in objects', () => {
    const spec = { __proto__: { type: 'string' }, safe: { type: 'number' } };
    const { resolved } = resolveRefs(Object.assign(Object.create(null), spec));
    expect((resolved as any)['__proto__']).toBeUndefined();
    expect((resolved as any)['safe']).toEqual({ type: 'number' });
  });

  it('caps resolution count to prevent exponential blowup', () => {
    // Create a spec with many refs that all point to the same schema
    const paths: Record<string, unknown> = {};
    for (let i = 0; i < 1100; i++) {
      paths[`/path${i}`] = {
        get: { schema: { $ref: `#/components/schemas/S${i}` } },
      };
    }
    const schemas: Record<string, unknown> = {};
    for (let i = 0; i < 1100; i++) {
      schemas[`S${i}`] = { type: 'string' };
    }
    const spec = { paths, components: { schemas } };
    const { warnings } = resolveRefs(spec);
    expect(warnings.some((w) => w.code === 'MAX_RESOLUTIONS_EXCEEDED')).toBe(true);
  });

  it('handles depth limit gracefully', () => {
    // Create a deeply nested spec (60 levels)
    let obj: Record<string, unknown> = { value: 'leaf' };
    for (let i = 0; i < 60; i++) {
      obj = { nested: obj };
    }
    const spec = { deep: obj };
    const { warnings } = resolveRefs(spec);
    expect(warnings.some((w) => w.code === 'MAX_DEPTH_EXCEEDED')).toBe(true);
  });

  it('memoizes resolved refs', () => {
    const spec = {
      components: { schemas: { Pet: { type: 'object' } } },
      a: { $ref: '#/components/schemas/Pet' },
      b: { $ref: '#/components/schemas/Pet' },
    };
    const { resolved } = resolveRefs(spec);
    expect((resolved as any).a).toEqual({ type: 'object' });
    expect((resolved as any).b).toEqual({ type: 'object' });
  });

  it('resolves refs in arrays', () => {
    const spec = {
      components: {
        schemas: {
          Tag: { type: 'string' },
        },
      },
      items: [{ $ref: '#/components/schemas/Tag' }, { type: 'number' }],
    };

    const { resolved } = resolveRefs(spec);
    expect((resolved as any).items).toEqual([{ type: 'string' }, { type: 'number' }]);
  });
});
