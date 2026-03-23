import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CliFlags } from '../../src/config/loader.js';

// Mock fs/promises before importing loader so the mock is in place when the
// module is first evaluated.
vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
  },
}));

// Import the mock handle AFTER vi.mock so we can configure return values per test.
import fs from 'node:fs/promises';
import { loadConfig } from '../../src/config/loader.js';

const mockReadFile = fs.readFile as ReturnType<typeof vi.fn>;

// Helper: make readFile throw ENOENT (file not found)
function rejectEnoent(): Promise<never> {
  const err = new Error('ENOENT') as NodeJS.ErrnoException;
  err.code = 'ENOENT';
  return Promise.reject(err);
}

// Helper: return a YAML string as the file contents
function resolveYaml(yaml: string): Promise<string> {
  return Promise.resolve(yaml);
}

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...originalEnv };
  // By default every readFile call returns ENOENT so tests that don't need a
  // config file don't have to configure it.
  mockReadFile.mockImplementation(rejectEnoent);
});

afterEach(() => {
  process.env = originalEnv;
});

// ---------------------------------------------------------------------------
// Minimal valid config (spec is required by the schema)
// ---------------------------------------------------------------------------

describe('loadConfig — defaults', () => {
  it('returns schema defaults when no file and no flags (except spec)', async () => {
    const config = await loadConfig({ spec: './api.yaml' });
    expect(config.spec).toBe('./api.yaml');
    expect(config.port).toBe(3000);
    expect(config.transport).toBe('sse');
    expect(config.includeDeprecated).toBe(false);
    expect(config.logLevel).toBe('info');
    expect(config.auth).toEqual({ type: 'none' });
    expect(config.filters).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// CLI flags override file config
// ---------------------------------------------------------------------------

describe('loadConfig — CLI flags override file config', () => {
  it('CLI port overrides file port', async () => {
    mockReadFile.mockResolvedValueOnce('spec: ./api.yaml\nport: 4000\n');
    const config = await loadConfig({ port: 9000 });
    expect(config.port).toBe(9000);
  });

  it('CLI spec overrides file spec', async () => {
    mockReadFile.mockResolvedValueOnce('spec: ./from-file.yaml\n');
    const config = await loadConfig({ spec: './from-cli.yaml' });
    expect(config.spec).toBe('./from-cli.yaml');
  });

  it('CLI logLevel overrides file logLevel', async () => {
    mockReadFile.mockResolvedValueOnce('spec: ./api.yaml\nlogLevel: warn\n');
    const config = await loadConfig({ spec: './api.yaml', logLevel: 'debug' });
    expect(config.logLevel).toBe('debug');
  });

  it('CLI transport overrides file transport', async () => {
    mockReadFile.mockResolvedValueOnce('spec: ./api.yaml\ntransport: sse\n');
    const config = await loadConfig({ spec: './api.yaml', transport: 'streamable-http' });
    expect(config.transport).toBe('streamable-http');
  });

  it('CLI includeDeprecated overrides file value', async () => {
    mockReadFile.mockResolvedValueOnce('spec: ./api.yaml\nincludeDeprecated: false\n');
    const config = await loadConfig({ spec: './api.yaml', includeDeprecated: true });
    expect(config.includeDeprecated).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// File config overrides schema defaults
// ---------------------------------------------------------------------------

describe('loadConfig — file config overrides defaults', () => {
  it('reads port from YAML file', async () => {
    mockReadFile.mockResolvedValueOnce('spec: ./api.yaml\nport: 8080\n');
    const config = await loadConfig({});
    expect(config.port).toBe(8080);
  });

  it('reads baseUrl from YAML file', async () => {
    mockReadFile.mockResolvedValueOnce('spec: ./api.yaml\nbaseUrl: https://api.example.com\n');
    const config = await loadConfig({});
    expect(config.baseUrl).toBe('https://api.example.com');
  });

  it('reads a JSON config file', async () => {
    // First two default candidates (yaml/yml) are ENOENT; third (.json) resolves
    mockReadFile
      .mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
      .mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
      .mockResolvedValueOnce(JSON.stringify({ spec: './api.yaml', port: 5000 }));
    const config = await loadConfig({});
    expect(config.port).toBe(5000);
  });
});

// ---------------------------------------------------------------------------
// Deep merge of auth and filters
// ---------------------------------------------------------------------------

describe('loadConfig — deep merge', () => {
  it('deep-merges auth from file with CLI override preserving unchanged keys', async () => {
    mockReadFile.mockResolvedValueOnce(
      'spec: ./api.yaml\nauth:\n  type: bearer\n  token: file-token\n',
    );
    // CLI overrides just the token via authHeader flag
    const config = await loadConfig({ authHeader: 'Authorization: Bearer cli-token' });
    expect(config.auth.type).toBe('bearer');
    expect(config.auth.token).toBe('cli-token');
  });

  it('deep-merges filters: CLI tags override file tags, file methods preserved', async () => {
    mockReadFile.mockResolvedValueOnce(
      'spec: ./api.yaml\nfilters:\n  tags: [pets]\n  methods: [get]\n',
    );
    const config = await loadConfig({ filterTags: ['users'] });
    expect(config.filters.tags).toEqual(['users']);
    expect(config.filters.methods).toEqual(['get']);
  });
});

// ---------------------------------------------------------------------------
// authHeader parsing
// ---------------------------------------------------------------------------

describe('loadConfig — authHeader parsing', () => {
  it('parses "Authorization: Bearer <token>" as bearer type', async () => {
    const config = await loadConfig({
      spec: './api.yaml',
      authHeader: 'Authorization: Bearer sk_live_abc',
    });
    expect(config.auth.type).toBe('bearer');
    expect(config.auth.token).toBe('sk_live_abc');
  });

  it('parses "authorization: bearer <token>" case-insensitively', async () => {
    const config = await loadConfig({
      spec: './api.yaml',
      authHeader: 'authorization: bearer mytoken',
    });
    expect(config.auth.type).toBe('bearer');
    expect(config.auth.token).toBe('mytoken');
  });

  it('parses a custom header as api_key type', async () => {
    const config = await loadConfig({
      spec: './api.yaml',
      authHeader: 'X-Api-Key: mykey123',
    });
    expect(config.auth.type).toBe('api_key');
    expect(config.auth.header).toBe('X-Api-Key');
    expect(config.auth.token).toBe('mykey123');
  });

  it('handles header values that contain colons', async () => {
    const config = await loadConfig({
      spec: './api.yaml',
      authHeader: 'X-Custom: val:ue:with:colons',
    });
    expect(config.auth.type).toBe('api_key');
    expect(config.auth.token).toBe('val:ue:with:colons');
  });
});

// ---------------------------------------------------------------------------
// Env var interpolation
// ---------------------------------------------------------------------------

describe('loadConfig — env var interpolation', () => {
  it('interpolates ${VAR} in baseUrl read from file', async () => {
    process.env['API_HOST'] = 'api.example.com';
    mockReadFile.mockResolvedValueOnce('spec: ./api.yaml\nbaseUrl: https://${API_HOST}\n');
    const config = await loadConfig({});
    expect(config.baseUrl).toBe('https://api.example.com');
  });

  it('interpolates ${VAR} in auth token read from file', async () => {
    process.env['MY_TOKEN'] = 'secret-token';
    mockReadFile.mockResolvedValueOnce(
      'spec: ./api.yaml\nauth:\n  type: bearer\n  token: ${MY_TOKEN}\n',
    );
    const config = await loadConfig({});
    expect(config.auth.token).toBe('secret-token');
  });

  it('throws when an interpolation variable is missing', async () => {
    delete process.env['MISSING'];
    mockReadFile.mockResolvedValueOnce('spec: ./api.yaml\nbaseUrl: https://${MISSING}/api\n');
    await expect(loadConfig({})).rejects.toThrow('MISSING');
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('loadConfig — errors', () => {
  it('throws when an explicit config file path is not found', async () => {
    mockReadFile.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    await expect(loadConfig({ config: 'nonexistent.yaml' })).rejects.toThrow(
      'Config file not found: nonexistent.yaml',
    );
  });

  it('propagates non-ENOENT fs errors', async () => {
    const permErr = Object.assign(new Error('EACCES'), { code: 'EACCES' });
    mockReadFile.mockRejectedValueOnce(permErr);
    await expect(loadConfig({ config: 'secret.yaml' })).rejects.toThrow('EACCES');
  });

  it('throws a descriptive error on invalid config values', async () => {
    mockReadFile.mockResolvedValueOnce('spec: ./api.yaml\nport: 99999\n');
    await expect(loadConfig({})).rejects.toThrow('Invalid configuration');
  });

  it('throws when spec is entirely missing and no flags provide it', async () => {
    await expect(loadConfig({})).rejects.toThrow('Invalid configuration');
  });
});

// ---------------------------------------------------------------------------
// Default config file discovery
// ---------------------------------------------------------------------------

describe('loadConfig — default config file discovery', () => {
  it('tries apifold.config.yaml first', async () => {
    mockReadFile.mockResolvedValueOnce('spec: ./api.yaml\n');
    await loadConfig({});
    const firstCall = mockReadFile.mock.calls[0] as [string, ...unknown[]];
    expect(firstCall[0]).toMatch(/apifold\.config\.yaml$/);
  });

  it('falls back to apifold.config.yml when .yaml is absent', async () => {
    mockReadFile
      .mockRejectedValueOnce(Object.assign(new Error(), { code: 'ENOENT' }))
      .mockResolvedValueOnce('spec: ./api.yaml\n');
    await loadConfig({});
    const secondCall = mockReadFile.mock.calls[1] as [string, ...unknown[]];
    expect(secondCall[0]).toMatch(/apifold\.config\.yml$/);
  });

  it('falls back to apifold.config.json when both yaml files are absent', async () => {
    mockReadFile
      .mockRejectedValueOnce(Object.assign(new Error(), { code: 'ENOENT' }))
      .mockRejectedValueOnce(Object.assign(new Error(), { code: 'ENOENT' }))
      .mockResolvedValueOnce(JSON.stringify({ spec: './api.yaml' }));
    const config = await loadConfig({});
    const thirdCall = mockReadFile.mock.calls[2] as [string, ...unknown[]];
    expect(thirdCall[0]).toMatch(/apifold\.config\.json$/);
    expect(config.spec).toBe('./api.yaml');
  });

  it('uses explicit config file when --config flag is provided', async () => {
    mockReadFile.mockResolvedValueOnce('spec: ./api.yaml\n');
    await loadConfig({ config: 'custom.yaml' });
    const firstCall = mockReadFile.mock.calls[0] as [string, ...unknown[]];
    expect(firstCall[0]).toMatch(/custom\.yaml$/);
    // Only one readFile call — no fallback candidates
    expect(mockReadFile.mock.calls.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// filter flags
// ---------------------------------------------------------------------------

describe('loadConfig — filter flags', () => {
  it('passes filterTags through to config.filters.tags', async () => {
    const config = await loadConfig({ spec: './api.yaml', filterTags: ['admin', 'users'] });
    expect(config.filters.tags).toEqual(['admin', 'users']);
  });

  it('passes filterMethods through to config.filters.methods', async () => {
    const config = await loadConfig({ spec: './api.yaml', filterMethods: ['get', 'post'] });
    expect(config.filters.methods).toEqual(['get', 'post']);
  });

  it('passes filterPaths through to config.filters.paths', async () => {
    const config = await loadConfig({ spec: './api.yaml', filterPaths: ['/users', '/orders'] });
    expect(config.filters.paths).toEqual(['/users', '/orders']);
  });
});

// ---------------------------------------------------------------------------
// Immutability
// ---------------------------------------------------------------------------

describe('loadConfig — returned config is frozen', () => {
  it('returns a frozen config object', async () => {
    const config = await loadConfig({ spec: './api.yaml' });
    expect(Object.isFrozen(config)).toBe(true);
  });
});
