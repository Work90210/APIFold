import { describe, it, expect, beforeEach } from 'vitest';
import { ServerRegistry, type L0ServerMeta } from '../../src/registry/server-registry.js';
import { createTestLogger } from '../helpers.js';

function makeServer(overrides: Partial<L0ServerMeta> = {}): L0ServerMeta {
  return {
    id: 'srv-1',
    slug: 'test-server',
    userId: 'user-1',
    authMode: 'bearer',
    baseUrl: 'https://api.example.com',
    rateLimit: 100,
    isActive: true,
    ...overrides,
  };
}

describe('ServerRegistry (L0)', () => {
  let registry: ServerRegistry;

  beforeEach(() => {
    registry = new ServerRegistry({ logger: createTestLogger() });
  });

  it('starts empty', () => {
    expect(registry.size).toBe(0);
    expect(registry.getBySlug('any')).toBeUndefined();
  });

  it('loads all servers in bulk', () => {
    const servers = [
      makeServer({ id: 'a', slug: 'alpha' }),
      makeServer({ id: 'b', slug: 'beta' }),
    ];
    registry.loadAll(servers);

    expect(registry.size).toBe(2);
    expect(registry.getBySlug('alpha')?.id).toBe('a');
    expect(registry.getBySlug('beta')?.id).toBe('b');
  });

  it('upserts a new server', () => {
    registry.upsert(makeServer());
    expect(registry.size).toBe(1);
    expect(registry.getBySlug('test-server')?.baseUrl).toBe('https://api.example.com');
  });

  it('upserts replaces existing server with same id', () => {
    registry.upsert(makeServer());
    registry.upsert(makeServer({ baseUrl: 'https://new.example.com' }));

    expect(registry.size).toBe(1);
    expect(registry.getBySlug('test-server')?.baseUrl).toBe('https://new.example.com');
  });

  it('upsert handles slug change', () => {
    registry.upsert(makeServer({ id: 'x', slug: 'old-slug' }));
    registry.upsert(makeServer({ id: 'x', slug: 'new-slug' }));

    expect(registry.getBySlug('old-slug')).toBeUndefined();
    expect(registry.getBySlug('new-slug')?.id).toBe('x');
    expect(registry.size).toBe(1);
  });

  it('removes a server', () => {
    registry.upsert(makeServer({ id: 'rm' }));
    const removed = registry.remove('rm');

    expect(removed?.id).toBe('rm');
    expect(registry.size).toBe(0);
    expect(registry.getBySlug('test-server')).toBeUndefined();
  });

  it('remove returns undefined for missing server', () => {
    expect(registry.remove('nonexistent')).toBeUndefined();
  });

  it('getAll returns all servers', () => {
    registry.loadAll([
      makeServer({ id: '1', slug: 'a' }),
      makeServer({ id: '2', slug: 'b' }),
      makeServer({ id: '3', slug: 'c' }),
    ]);

    expect(registry.getAll()).toHaveLength(3);
  });

  it('getById returns the correct server', () => {
    registry.upsert(makeServer({ id: 'find-me' }));
    expect(registry.getById('find-me')?.slug).toBe('test-server');
    expect(registry.getById('nope')).toBeUndefined();
  });
});
