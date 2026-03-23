import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { interpolateEnvVars, configSchema } from '../../src/config/schema.js';

describe('interpolateEnvVars', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('replaces a single ${VAR} with the env value', () => {
    process.env['MY_TOKEN'] = 'secret123';
    expect(interpolateEnvVars('Bearer ${MY_TOKEN}')).toBe('Bearer secret123');
  });

  it('replaces multiple ${VAR} placeholders in one string', () => {
    process.env['HOST'] = 'api.example.com';
    process.env['VERSION'] = 'v2';
    expect(interpolateEnvVars('https://${HOST}/${VERSION}/endpoint')).toBe(
      'https://api.example.com/v2/endpoint',
    );
  });

  it('throws when the referenced env var is not set', () => {
    delete process.env['MISSING_VAR'];
    expect(() => interpolateEnvVars('value-${MISSING_VAR}')).toThrow(
      'Environment variable "MISSING_VAR" is not set',
    );
  });

  it('throws with the correct variable name when multiple vars are present and one is missing', () => {
    process.env['PRESENT'] = 'ok';
    delete process.env['ABSENT'];
    expect(() => interpolateEnvVars('${PRESENT}-${ABSENT}')).toThrow(
      'Environment variable "ABSENT" is not set',
    );
  });

  it('returns the string unchanged when there are no placeholders', () => {
    expect(interpolateEnvVars('no placeholders here')).toBe('no placeholders here');
  });

  it('returns an empty string unchanged', () => {
    expect(interpolateEnvVars('')).toBe('');
  });

  it('handles a var name with leading/trailing whitespace', () => {
    process.env['SPACED'] = 'trimmed';
    // The regex trims the key before lookup
    expect(interpolateEnvVars('${ SPACED }')).toBe('trimmed');
  });

  it('returns the string unchanged when it contains ${ but no closing }', () => {
    // Regex requires a closing }, so malformed placeholder is left as-is
    expect(interpolateEnvVars('no close ${brace')).toBe('no close ${brace');
  });
});

describe('configSchema', () => {
  it('applies default values when only spec is provided', () => {
    const result = configSchema.safeParse({ spec: './openapi.yaml' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.port).toBe(3000);
      expect(result.data.transport).toBe('sse');
      expect(result.data.includeDeprecated).toBe(false);
      expect(result.data.logLevel).toBe('info');
      expect(result.data.auth).toEqual({ type: 'none' });
      expect(result.data.filters).toEqual({});
    }
  });

  it('accepts a valid full configuration', () => {
    const input = {
      spec: './petstore.yaml',
      port: 8080,
      transport: 'streamable-http',
      baseUrl: 'https://api.example.com',
      auth: { type: 'bearer', token: 'mytoken' },
      filters: { tags: ['users'], methods: ['get', 'post'], paths: ['/users'] },
      includeDeprecated: true,
      logLevel: 'debug',
    };
    const result = configSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('fails when spec is missing', () => {
    const result = configSchema.safeParse({ port: 3000 });
    expect(result.success).toBe(false);
  });

  it('fails when port is below 1', () => {
    const result = configSchema.safeParse({ spec: './api.yaml', port: 0 });
    expect(result.success).toBe(false);
  });

  it('fails when port exceeds 65535', () => {
    const result = configSchema.safeParse({ spec: './api.yaml', port: 65536 });
    expect(result.success).toBe(false);
  });

  it('coerces port from string to number', () => {
    const result = configSchema.safeParse({ spec: './api.yaml', port: '9000' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.port).toBe(9000);
    }
  });

  it('fails for an invalid transport value', () => {
    const result = configSchema.safeParse({ spec: './api.yaml', transport: 'websocket' });
    expect(result.success).toBe(false);
  });

  it('fails for an invalid logLevel value', () => {
    const result = configSchema.safeParse({ spec: './api.yaml', logLevel: 'verbose' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid HTTP methods in filters', () => {
    const result = configSchema.safeParse({
      spec: './api.yaml',
      filters: { methods: ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'] },
    });
    expect(result.success).toBe(true);
  });

  it('fails for an invalid HTTP method in filters', () => {
    const result = configSchema.safeParse({
      spec: './api.yaml',
      filters: { methods: ['get', 'CONNECT'] },
    });
    expect(result.success).toBe(false);
  });

  it('accepts auth type none without token', () => {
    const result = configSchema.safeParse({
      spec: './api.yaml',
      auth: { type: 'none' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts auth type bearer with token', () => {
    const result = configSchema.safeParse({
      spec: './api.yaml',
      auth: { type: 'bearer', token: 'tok_abc' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts auth type api_key with header and token', () => {
    const result = configSchema.safeParse({
      spec: './api.yaml',
      auth: { type: 'api_key', header: 'X-Api-Key', token: 'key123' },
    });
    expect(result.success).toBe(true);
  });

  it('fails for an invalid auth type', () => {
    const result = configSchema.safeParse({
      spec: './api.yaml',
      auth: { type: 'oauth' },
    });
    expect(result.success).toBe(false);
  });

  it('accepts port at boundary value 1', () => {
    const result = configSchema.safeParse({ spec: './api.yaml', port: 1 });
    expect(result.success).toBe(true);
  });

  it('accepts port at boundary value 65535', () => {
    const result = configSchema.safeParse({ spec: './api.yaml', port: 65535 });
    expect(result.success).toBe(true);
  });

  it('rejects a non-integer port', () => {
    const result = configSchema.safeParse({ spec: './api.yaml', port: 3000.5 });
    expect(result.success).toBe(false);
  });
});
