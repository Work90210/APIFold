import { describe, it, expect } from 'vitest';
import {
  parseSpec,
  transformSpec,
  ParseError,
  ValidationError,
  ResolveError,
  TransformError,
  TransformerError,
} from '../src/index.js';

describe('public API exports', () => {
  it('exports parseSpec function', () => {
    expect(typeof parseSpec).toBe('function');
  });

  it('exports transformSpec function', () => {
    expect(typeof transformSpec).toBe('function');
  });

  it('exports error classes', () => {
    expect(new ParseError('test')).toBeInstanceOf(TransformerError);
    expect(new ValidationError('test')).toBeInstanceOf(TransformerError);
  });

  it('ResolveError has correct code and inherits TransformerError', () => {
    const err = new ResolveError('test');
    expect(err).toBeInstanceOf(TransformerError);
    expect(err.code).toBe('RESOLVE_ERROR');
    expect(err.name).toBe('ResolveError');
    expect(err.message).toBe('test');
  });

  it('TransformError has correct code and inherits TransformerError', () => {
    const err = new TransformError('test');
    expect(err).toBeInstanceOf(TransformerError);
    expect(err.code).toBe('TRANSFORM_ERROR');
    expect(err.name).toBe('TransformError');
    expect(err.message).toBe('test');
  });

  it('end-to-end: parse and transform a simple spec', () => {
    const parsed = parseSpec({
      spec: {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/hello': {
            get: {
              operationId: 'sayHello',
              summary: 'Say hello',
            },
          },
        },
      },
    });

    const result = transformSpec({ spec: parsed.spec });
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0]!.name).toBe('sayhello');
  });
});
