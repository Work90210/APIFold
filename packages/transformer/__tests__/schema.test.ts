import { describe, it, expect } from 'vitest';
import { mergeAllOf, flattenSchema } from '../src/schema.js';

describe('mergeAllOf', () => {
  it('merges properties from multiple schemas', () => {
    const result = mergeAllOf([
      { type: 'object', properties: { name: { type: 'string' } } },
      { type: 'object', properties: { age: { type: 'number' } } },
    ]);

    expect(result).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
    });
  });

  it('merges required arrays', () => {
    const result = mergeAllOf([
      { type: 'object', required: ['name'] },
      { type: 'object', required: ['age'] },
    ]);

    expect(result['required']).toEqual(['name', 'age']);
  });

  it('deduplicates required fields', () => {
    const result = mergeAllOf([
      { type: 'object', required: ['name'] },
      { type: 'object', required: ['name', 'age'] },
    ]);

    expect(result['required']).toEqual(['name', 'age']);
  });

  it('last-writer-wins for conflicting properties', () => {
    const result = mergeAllOf([
      { type: 'object', properties: { name: { type: 'string' } } },
      { type: 'object', properties: { name: { type: 'number' } } },
    ]);

    expect((result['properties'] as Record<string, unknown>)['name']).toEqual({ type: 'number' });
  });

  it('filters __proto__ from properties and schema keys', () => {
    // Use Object.create(null) to make __proto__ a regular enumerable key
    const props = Object.create(null) as Record<string, unknown>;
    props['safe'] = { type: 'string' };
    props['__proto__'] = { type: 'evil' };

    const schema = Object.create(null) as Record<string, unknown>;
    schema['type'] = 'object';
    schema['properties'] = props;
    schema['constructor'] = 'polluted';

    const result = mergeAllOf([schema]);

    // Verify __proto__ is not in the merged properties' own keys
    const resultProps = result['properties'] as Record<string, unknown>;
    expect(Object.keys(resultProps)).not.toContain('__proto__');
    expect(resultProps['safe']).toEqual({ type: 'string' });
    // 'constructor' schema key should be filtered from rest keys
    expect(Object.prototype.hasOwnProperty.call(result, 'constructor')).toBe(false);
  });

  it('preserves additional schema fields', () => {
    const result = mergeAllOf([
      { type: 'object', description: 'A pet' },
    ]);

    expect(result['description']).toBe('A pet');
  });
});

describe('flattenSchema', () => {
  it('flattens allOf into merged schema', () => {
    const result = flattenSchema({
      allOf: [
        { type: 'object', properties: { name: { type: 'string' } } },
        { type: 'object', properties: { age: { type: 'number' } } },
      ],
    });

    expect(result['properties']).toEqual({
      name: { type: 'string' },
      age: { type: 'number' },
    });
    expect(result['allOf']).toBeUndefined();
  });

  it('preserves oneOf as-is', () => {
    const schema = {
      oneOf: [{ type: 'string' }, { type: 'number' }],
    };
    const result = flattenSchema(schema);
    expect(result['oneOf']).toEqual([{ type: 'string' }, { type: 'number' }]);
  });

  it('preserves anyOf as-is', () => {
    const schema = {
      anyOf: [{ type: 'string' }, { type: 'number' }],
    };
    const result = flattenSchema(schema);
    expect(result['anyOf']).toEqual([{ type: 'string' }, { type: 'number' }]);
  });

  it('returns simple schema unchanged', () => {
    const schema = { type: 'string' };
    expect(flattenSchema(schema)).toEqual({ type: 'string' });
  });

  it('handles nested allOf', () => {
    const result = flattenSchema({
      allOf: [
        {
          allOf: [
            { type: 'object', properties: { a: { type: 'string' } } },
            { type: 'object', properties: { b: { type: 'string' } } },
          ],
        },
        { type: 'object', properties: { c: { type: 'string' } } },
      ],
    });

    const props = result['properties'] as Record<string, unknown>;
    expect(props['a']).toEqual({ type: 'string' });
    expect(props['b']).toEqual({ type: 'string' });
    expect(props['c']).toEqual({ type: 'string' });
  });
});
