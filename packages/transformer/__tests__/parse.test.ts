import { describe, it, expect } from 'vitest';
import { parseSpec } from '../src/parse.js';
import { ParseError } from '../src/errors.js';

describe('parseSpec', () => {
  it('parses a valid 3.0 spec', () => {
    const result = parseSpec({
      spec: {
        openapi: '3.0.3',
        info: { title: 'Petstore', version: '1.0.0' },
        paths: {
          '/pets': {
            get: { operationId: 'listPets', summary: 'List all pets' },
          },
        },
      },
    });

    expect(result.version).toBe('3.0');
    expect(result.spec.info.title).toBe('Petstore');
  });

  it('parses a valid 3.1 spec', () => {
    const result = parseSpec({
      spec: {
        openapi: '3.1.0',
        info: { title: 'Test API', version: '2.0.0' },
        paths: {},
      },
    });

    expect(result.version).toBe('3.1');
  });

  it('throws on null input', () => {
    expect(() => parseSpec({ spec: null })).toThrow(ParseError);
  });

  it('throws on undefined input', () => {
    expect(() => parseSpec({ spec: undefined })).toThrow(ParseError);
  });

  it('throws on array input', () => {
    expect(() => parseSpec({ spec: [] })).toThrow(ParseError);
  });

  it('throws on number input', () => {
    expect(() => parseSpec({ spec: 42 })).toThrow(ParseError);
  });

  it('throws on string input', () => {
    expect(() => parseSpec({ spec: 'not a spec' })).toThrow(ParseError);
  });

  it('resolves $refs during parsing', () => {
    const result = parseSpec({
      spec: {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/pets': {
            get: {
              operationId: 'listPets',
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
        components: {
          schemas: {
            Pet: { type: 'object', properties: { name: { type: 'string' } } },
          },
        },
      },
    });

    const schema = (result.spec as any).paths['/pets'].get.responses['200'].content['application/json'].schema;
    expect(schema).toEqual({ type: 'object', properties: { name: { type: 'string' } } });
  });

  it('collects warnings for circular refs', () => {
    const result = parseSpec({
      spec: {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
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
      },
    });

    expect(result.warnings.some((w) => w.code === 'CIRCULAR_REF')).toBe(true);
  });

  it('warns on empty paths', () => {
    const result = parseSpec({
      spec: {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
      },
    });

    expect(result.warnings.some((w) => w.code === 'EMPTY_PATHS')).toBe(true);
  });
});
