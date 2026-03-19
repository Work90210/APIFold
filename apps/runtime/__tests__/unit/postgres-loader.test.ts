import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadAllServers, reloadServer, fetchToolsForServer, fetchCredentialHeaders } from '../../src/sync/postgres-loader.js';
import type { DbClient } from '../../src/sync/postgres-loader.js';
import { ServerRegistry } from '../../src/registry/server-registry.js';
import { createTestLogger } from '../helpers.js';

function createMockDb(rows: unknown[] = []): DbClient {
  return { query: vi.fn().mockResolvedValue({ rows }) };
}

const serverRow = {
  id: 'srv-1',
  slug: 'test',
  user_id: 'user-1',
  auth_mode: 'bearer',
  base_url: 'https://api.example.com',
  rate_limit: 100,
  is_active: true,
};

describe('loadAllServers', () => {
  it('loads active servers into registry', async () => {
    const db = createMockDb([serverRow, { ...serverRow, id: 'srv-2', slug: 'other' }]);
    const registry = new ServerRegistry({ logger: createTestLogger() });

    await loadAllServers({ db, logger: createTestLogger(), registry });

    expect(registry.size).toBe(2);
    expect(registry.getBySlug('test')?.id).toBe('srv-1');
    expect(registry.getBySlug('other')?.id).toBe('srv-2');
  });

  it('clears existing entries on reload', async () => {
    const registry = new ServerRegistry({ logger: createTestLogger() });
    const db1 = createMockDb([serverRow]);
    await loadAllServers({ db: db1, logger: createTestLogger(), registry });

    const db2 = createMockDb([]);
    await loadAllServers({ db: db2, logger: createTestLogger(), registry });

    expect(registry.size).toBe(0);
  });

  it('rejects invalid auth_mode', async () => {
    const db = createMockDb([{ ...serverRow, auth_mode: 'oauth2' }]);
    const registry = new ServerRegistry({ logger: createTestLogger() });

    await expect(
      loadAllServers({ db, logger: createTestLogger(), registry }),
    ).rejects.toThrow('Invalid auth_mode');
  });

  it('rejects private/internal baseUrl in production (SSRF protection)', async () => {
    const originalEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';
    try {
      const db = createMockDb([{ ...serverRow, base_url: 'http://169.254.169.254/latest' }]);
      const registry = new ServerRegistry({ logger: createTestLogger() });

      await expect(
        loadAllServers({ db, logger: createTestLogger(), registry }),
      ).rejects.toThrow('base_url targets a private or internal host');
    } finally {
      process.env['NODE_ENV'] = originalEnv;
    }
  });
});

describe('reloadServer', () => {
  it('upserts an active server', async () => {
    const db = createMockDb([serverRow]);
    const registry = new ServerRegistry({ logger: createTestLogger() });
    const deps = { db, logger: createTestLogger(), registry };

    const result = await reloadServer(deps, 'srv-1');

    expect(result).not.toBeNull();
    expect(result!.slug).toBe('test');
    expect(registry.getBySlug('test')).toBeDefined();
  });

  it('removes inactive server', async () => {
    const db = createMockDb([{ ...serverRow, is_active: false }]);
    const registry = new ServerRegistry({ logger: createTestLogger() });
    registry.upsert({
      id: 'srv-1', slug: 'test', userId: 'user-1',
      authMode: 'bearer', baseUrl: 'https://api.example.com', rateLimit: 100, isActive: true,
    });
    const deps = { db, logger: createTestLogger(), registry };

    const result = await reloadServer(deps, 'srv-1');

    expect(result).toBeNull();
    expect(registry.getBySlug('test')).toBeUndefined();
  });

  it('removes server not found in DB', async () => {
    const db = createMockDb([]);
    const registry = new ServerRegistry({ logger: createTestLogger() });
    registry.upsert({
      id: 'srv-1', slug: 'test', userId: 'user-1',
      authMode: 'bearer', baseUrl: 'https://api.example.com', rateLimit: 100, isActive: true,
    });
    const deps = { db, logger: createTestLogger(), registry };

    const result = await reloadServer(deps, 'srv-1');

    expect(result).toBeNull();
    expect(registry.size).toBe(0);
  });

  it('rejects invalid auth_mode in reloadServer', async () => {
    const db = createMockDb([{ ...serverRow, auth_mode: 'oauth2' }]);
    const registry = new ServerRegistry({ logger: createTestLogger() });
    const deps = { db, logger: createTestLogger(), registry };

    await expect(reloadServer(deps, 'srv-1')).rejects.toThrow('Invalid auth_mode');
  });

  it('rejects private/internal baseUrl in production (SSRF protection)', async () => {
    const originalEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';
    try {
      const db = createMockDb([{ ...serverRow, base_url: 'http://localhost:8080' }]);
      const registry = new ServerRegistry({ logger: createTestLogger() });
      const deps = { db, logger: createTestLogger(), registry };

      await expect(reloadServer(deps, 'srv-1')).rejects.toThrow('base_url targets a private or internal host');
    } finally {
      process.env['NODE_ENV'] = originalEnv;
    }
  });
});

describe('fetchToolsForServer', () => {
  it('returns tool definitions', async () => {
    const db = createMockDb([
      { id: 't1', name: 'list-users', description: 'List all users', input_schema: { type: 'object' } },
      { id: 't2', name: 'get-user', description: null, input_schema: {} },
    ]);

    const tools = await fetchToolsForServer(db, 'srv-1');

    expect(tools).toHaveLength(2);
    expect(tools[0]!.name).toBe('list-users');
    expect(tools[1]!.description).toBeNull();
  });

  it('returns empty array when no tools', async () => {
    const db = createMockDb([]);
    const tools = await fetchToolsForServer(db, 'srv-1');
    expect(tools).toHaveLength(0);
  });
});

describe('fetchCredentialHeaders', () => {
  const decryptFn = vi.fn((encrypted: string) => `decrypted:${encrypted}`);

  beforeEach(() => {
    decryptFn.mockClear();
  });

  it('returns bearer auth header', async () => {
    const db = createMockDb([
      { encrypted_key: 'enc-key', auth_type: 'bearer', expires_at: null },
    ]);

    const headers = await fetchCredentialHeaders(db, 'srv-1', decryptFn);

    expect(headers).toEqual({ Authorization: 'Bearer decrypted:enc-key' });
    expect(decryptFn).toHaveBeenCalledWith('enc-key');
  });

  it('returns api_key header', async () => {
    const db = createMockDb([
      { encrypted_key: 'enc-key', auth_type: 'api_key', expires_at: null },
    ]);

    const headers = await fetchCredentialHeaders(db, 'srv-1', decryptFn);

    expect(headers).toEqual({ 'X-API-Key': 'decrypted:enc-key' });
  });

  it('returns empty headers when no credential found', async () => {
    const db = createMockDb([]);
    const headers = await fetchCredentialHeaders(db, 'srv-1', decryptFn);
    expect(headers).toEqual({});
  });

  it('returns empty headers when credential is expired', async () => {
    const db = createMockDb([
      { encrypted_key: 'enc-key', auth_type: 'bearer', expires_at: '2020-01-01T00:00:00Z' },
    ]);

    const headers = await fetchCredentialHeaders(db, 'srv-1', decryptFn);

    expect(headers).toEqual({});
    expect(decryptFn).not.toHaveBeenCalled();
  });

  it('throws on decrypt failure', async () => {
    const db = createMockDb([
      { encrypted_key: 'bad-data', auth_type: 'bearer', expires_at: null },
    ]);
    const failingDecrypt = vi.fn(() => { throw new Error('Decryption failed'); });

    await expect(
      fetchCredentialHeaders(db, 'srv-1', failingDecrypt),
    ).rejects.toThrow('Credential decryption failed');
  });

  it('throws on unsupported auth type', async () => {
    const db = createMockDb([
      { encrypted_key: 'enc-key', auth_type: 'oauth2', expires_at: null },
    ]);

    await expect(
      fetchCredentialHeaders(db, 'srv-1', decryptFn),
    ).rejects.toThrow('Unsupported auth type: oauth2');
  });
});
