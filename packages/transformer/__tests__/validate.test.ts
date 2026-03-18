import { describe, it, expect } from 'vitest';
import { validateSpec, detectVersion } from '../src/validate.js';
import { ValidationError } from '../src/errors.js';

describe('validateSpec', () => {
  it('validates a valid spec', () => {
    const { warnings } = validateSpec({
      openapi: '3.0.3',
      info: { title: 'Test', version: '1.0.0' },
      paths: { '/pets': {} },
    });
    expect(warnings).toHaveLength(0);
  });

  it('throws on non-object input', () => {
    expect(() => validateSpec('string')).toThrow(ValidationError);
  });

  it('throws on null input', () => {
    expect(() => validateSpec(null)).toThrow(ValidationError);
  });

  it('throws on missing openapi field', () => {
    expect(() => validateSpec({ info: { title: 'Test', version: '1.0.0' }, paths: {} })).toThrow(
      ValidationError,
    );
  });

  it('throws on unsupported version', () => {
    expect(() =>
      validateSpec({ openapi: '2.0', info: { title: 'Test', version: '1.0.0' }, paths: {} }),
    ).toThrow('Unsupported OpenAPI version');
  });

  it('truncates long version strings in error message', () => {
    const longVersion = 'x'.repeat(100);
    expect(() =>
      validateSpec({ openapi: longVersion, info: { title: 'Test', version: '1.0.0' }, paths: {} }),
    ).toThrow('...');
  });

  it('throws on missing info', () => {
    expect(() => validateSpec({ openapi: '3.0.0', paths: {} })).toThrow('Missing or invalid "info"');
  });

  it('throws on missing info.title', () => {
    expect(() =>
      validateSpec({ openapi: '3.0.0', info: { version: '1.0.0' }, paths: {} }),
    ).toThrow('Missing or invalid "info.title"');
  });

  it('throws on missing info.version', () => {
    expect(() =>
      validateSpec({ openapi: '3.0.0', info: { title: 'Test' }, paths: {} }),
    ).toThrow('Missing or invalid "info.version"');
  });

  it('warns on missing paths', () => {
    const { warnings } = validateSpec({
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
    });
    expect(warnings.some((w) => w.code === 'MISSING_PATHS')).toBe(true);
  });

  it('warns on empty paths', () => {
    const { warnings } = validateSpec({
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    });
    expect(warnings.some((w) => w.code === 'EMPTY_PATHS')).toBe(true);
  });
});

describe('detectVersion', () => {
  it('detects 3.1', () => {
    expect(
      detectVersion({
        openapi: '3.1.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
      }),
    ).toBe('3.1');
  });

  it('detects 3.0', () => {
    expect(
      detectVersion({
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
      }),
    ).toBe('3.0');
  });
});
