import { describe, it, expect } from 'vitest';
import { createSpecSchema, updateSpecSchema } from '../../lib/validation/spec.schema.js';
import { createServerSchema, updateServerSchema } from '../../lib/validation/server.schema.js';
import { updateToolSchema } from '../../lib/validation/tool.schema.js';
import { createCredentialSchema } from '../../lib/validation/credential.schema.js';
import { uuidParam } from '../../lib/validation/common.schema.js';

describe('Zod Validation Schemas', () => {
  describe('createSpecSchema', () => {
    it('accepts valid spec with sourceUrl', () => {
      const result = createSpecSchema.parse({
        name: 'My API',
        sourceUrl: 'https://example.com/spec.json',
      });
      expect(result.name).toBe('My API');
      expect(result.sourceUrl).toBe('https://example.com/spec.json');
    });

    it('accepts valid spec with rawSpec', () => {
      const result = createSpecSchema.parse({
        name: 'My API',
        rawSpec: { openapi: '3.0.0' },
      });
      expect(result.rawSpec).toEqual({ openapi: '3.0.0' });
    });

    it('rejects spec without sourceUrl or rawSpec', () => {
      expect(() => createSpecSchema.parse({ name: 'My API' })).toThrow();
    });

    it('rejects empty name', () => {
      expect(() => createSpecSchema.parse({
        name: '',
        rawSpec: { openapi: '3.0.0' },
      })).toThrow();
    });

    it('defaults version to 1.0.0', () => {
      const result = createSpecSchema.parse({
        name: 'My API',
        rawSpec: { openapi: '3.0.0' },
      });
      expect(result.version).toBe('1.0.0');
    });
  });

  describe('updateSpecSchema', () => {
    it('accepts partial update', () => {
      const result = updateSpecSchema.parse({ name: 'New Name' });
      expect(result.name).toBe('New Name');
    });

    it('accepts empty object', () => {
      const result = updateSpecSchema.parse({});
      expect(result).toEqual({});
    });
  });

  describe('createServerSchema', () => {
    it('accepts valid server', () => {
      const result = createServerSchema.parse({
        specId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'My Server',
        slug: 'my-server',
        authMode: 'bearer',
        baseUrl: 'https://api.example.com',
      });
      expect(result.slug).toBe('my-server');
      expect(result.rateLimitPerMinute).toBe(100);
    });

    it('rejects invalid slug (uppercase)', () => {
      expect(() => createServerSchema.parse({
        specId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'My Server',
        slug: 'MyServer',
        authMode: 'none',
        baseUrl: 'https://api.example.com',
      })).toThrow();
    });

    it('rejects slug shorter than 3 chars', () => {
      expect(() => createServerSchema.parse({
        specId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'My Server',
        slug: 'ab',
        authMode: 'none',
        baseUrl: 'https://api.example.com',
      })).toThrow();
    });
  });

  describe('updateServerSchema', () => {
    it('accepts partial update', () => {
      const result = updateServerSchema.parse({ isActive: false });
      expect(result.isActive).toBe(false);
    });
  });

  describe('updateToolSchema', () => {
    it('accepts isActive toggle', () => {
      const result = updateToolSchema.parse({ isActive: true });
      expect(result.isActive).toBe(true);
    });

    it('rejects missing isActive', () => {
      expect(() => updateToolSchema.parse({})).toThrow();
    });
  });

  describe('createCredentialSchema', () => {
    it('accepts valid credential', () => {
      const result = createCredentialSchema.parse({
        label: 'My API Key',
        plaintextKey: 'sk-12345',
        authType: 'api_key',
      });
      expect(result.label).toBe('My API Key');
      expect(result.authType).toBe('api_key');
    });

    it('rejects invalid authType', () => {
      expect(() => createCredentialSchema.parse({
        label: 'Key',
        plaintextKey: 'sk-12345',
        authType: 'none',
      })).toThrow();
    });

    it('rejects empty plaintextKey', () => {
      expect(() => createCredentialSchema.parse({
        label: 'Key',
        plaintextKey: '',
        authType: 'bearer',
      })).toThrow();
    });
  });

  describe('uuidParam', () => {
    it('accepts valid UUID', () => {
      expect(uuidParam.parse('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('rejects non-UUID string', () => {
      expect(() => uuidParam.parse('not-a-uuid')).toThrow();
    });
  });
});
