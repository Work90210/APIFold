import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { autoConvert } from '../src/convert.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixture(relativePath: string): unknown {
  const fullPath = join(__dirname, '..', '__fixtures__', relativePath);
  return JSON.parse(readFileSync(fullPath, 'utf-8')) as unknown;
}

const swagger2Fixture = loadFixture('swagger2/petstore-minimal.json');

const openapi3Fixture = {
  openapi: '3.0.3',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {
    '/users': {
      get: {
        operationId: 'listUsers',
        summary: 'List users',
        responses: { '200': { description: 'OK' } },
      },
    },
  },
};

describe('autoConvert', () => {
  describe('non-Swagger 2.0 inputs — returns converted: false', () => {
    it('returns converted: false for an OpenAPI 3.0 spec', async () => {
      const result = await autoConvert(openapi3Fixture);

      expect(result.converted).toBe(false);
    });

    it('passes the original spec through unchanged for OpenAPI 3.0', async () => {
      const result = await autoConvert(openapi3Fixture);

      expect(result.spec).toBe(openapi3Fixture);
    });

    it('returns converted: false for null input', async () => {
      const result = await autoConvert(null);

      expect(result.converted).toBe(false);
    });

    it('returns converted: false for undefined input', async () => {
      const result = await autoConvert(undefined);

      expect(result.converted).toBe(false);
    });

    it('returns converted: false for a string input', async () => {
      const result = await autoConvert('not an object');

      expect(result.converted).toBe(false);
    });

    it('returns converted: false for a number input', async () => {
      const result = await autoConvert(42);

      expect(result.converted).toBe(false);
    });

    it('returns converted: false for an array input', async () => {
      const result = await autoConvert([]);

      expect(result.converted).toBe(false);
    });

    it('returns converted: false for an empty object (no swagger field)', async () => {
      const result = await autoConvert({});

      expect(result.converted).toBe(false);
    });

    it('returns an empty warnings array for non-Swagger inputs', async () => {
      const result = await autoConvert(null);

      expect(result.warnings).toEqual([]);
    });
  });

  describe('Swagger 2.0 spec — performs conversion', () => {
    it('returns converted: true for a Swagger 2.0 spec', async () => {
      const result = await autoConvert(swagger2Fixture);

      expect(result.converted).toBe(true);
    });

    it('reports originalVersion as "2.0"', async () => {
      const result = await autoConvert(swagger2Fixture);

      expect(result.originalVersion).toBe('2.0');
    });

    it('produces a converted spec with a valid OpenAPI 3.x openapi field', async () => {
      const result = await autoConvert(swagger2Fixture);

      const spec = result.spec as Record<string, unknown>;
      expect(typeof spec['openapi']).toBe('string');
      expect((spec['openapi'] as string).startsWith('3.')).toBe(true);
    });

    it('preserves the paths from the original Swagger 2.0 spec', async () => {
      const result = await autoConvert(swagger2Fixture);

      const spec = result.spec as Record<string, unknown>;
      expect(spec['paths']).toBeDefined();
      expect(typeof spec['paths']).toBe('object');

      const paths = spec['paths'] as Record<string, unknown>;
      expect(paths['/users']).toBeDefined();
    });

    it('collects a warnings array (may be empty or non-empty)', async () => {
      const result = await autoConvert(swagger2Fixture);

      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe('immutability — result is frozen', () => {
    it('freezes the result object for non-Swagger input', async () => {
      const result = await autoConvert(null);

      expect(Object.isFrozen(result)).toBe(true);
    });

    it('freezes the result object for a Swagger 2.0 conversion', async () => {
      const result = await autoConvert(swagger2Fixture);

      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('ConvertResult shape', () => {
    it('result has the expected keys for non-Swagger input', async () => {
      const result = await autoConvert(openapi3Fixture);

      expect(result).toHaveProperty('spec');
      expect(result).toHaveProperty('converted');
      expect(result).toHaveProperty('warnings');
    });

    it('result has the expected keys for a converted Swagger 2.0 spec', async () => {
      const result = await autoConvert(swagger2Fixture);

      expect(result).toHaveProperty('spec');
      expect(result).toHaveProperty('converted');
      expect(result).toHaveProperty('originalVersion');
      expect(result).toHaveProperty('warnings');
    });
  });
});
