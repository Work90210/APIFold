import { describe, it, expect } from 'vitest';
import { listAll, getById, search, getCategories } from '../src/index.js';
import type { RegistryEntry } from '../src/types.js';

// ---------------------------------------------------------------------------
// listAll()
// ---------------------------------------------------------------------------

describe('listAll()', () => {
  it('returns exactly 8 entries', () => {
    expect(listAll()).toHaveLength(8);
  });

  it('returns a frozen (readonly) array', () => {
    const result = listAll();
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('returns the same reference on repeated calls', () => {
    expect(listAll()).toBe(listAll());
  });

  it('every entry has all required RegistryEntry fields', () => {
    const requiredFields: (keyof RegistryEntry)[] = [
      'id',
      'name',
      'description',
      'category',
      'authType',
      'docsUrl',
      'tags',
      'specPath',
      'operationCount',
    ];

    for (const entry of listAll()) {
      for (const field of requiredFields) {
        expect(entry, `entry "${entry.id}" is missing field "${field}"`).toHaveProperty(field);
      }
    }
  });

  it('every entry id is a non-empty string', () => {
    for (const entry of listAll()) {
      expect(typeof entry.id).toBe('string');
      expect(entry.id.length).toBeGreaterThan(0);
    }
  });

  it('all entry IDs are unique', () => {
    const ids = listAll().map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all entries have a valid HTTPS docsUrl', () => {
    for (const entry of listAll()) {
      expect(entry.docsUrl, `entry "${entry.id}" docsUrl is not HTTPS`).toMatch(/^https:\/\//);
    }
  });

  it('all entries have a non-empty tags array', () => {
    for (const entry of listAll()) {
      expect(Array.isArray(entry.tags), `entry "${entry.id}" tags is not an array`).toBe(true);
      expect(entry.tags.length, `entry "${entry.id}" tags array is empty`).toBeGreaterThan(0);
    }
  });

  it('all entries have a positive operationCount', () => {
    for (const entry of listAll()) {
      expect(entry.operationCount, `entry "${entry.id}" has non-positive operationCount`).toBeGreaterThan(0);
    }
  });

  it('all entries have a non-empty specPath', () => {
    for (const entry of listAll()) {
      expect(typeof entry.specPath).toBe('string');
      expect(entry.specPath.length, `entry "${entry.id}" specPath is empty`).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// getById()
// ---------------------------------------------------------------------------

describe('getById()', () => {
  it("returns the Stripe entry for id 'stripe'", () => {
    const result = getById('stripe');
    expect(result).toBeDefined();
    expect(result?.id).toBe('stripe');
    expect(result?.name).toBe('Stripe');
    expect(result?.category).toBe('payments');
  });

  it('returns undefined for a nonexistent id', () => {
    expect(getById('nonexistent')).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(getById('')).toBeUndefined();
  });

  it('is case-sensitive — uppercase id returns undefined', () => {
    expect(getById('STRIPE')).toBeUndefined();
  });

  it('returns the GitHub entry for id "github"', () => {
    const result = getById('github');
    expect(result).toBeDefined();
    expect(result?.id).toBe('github');
  });
});

// ---------------------------------------------------------------------------
// search()
// ---------------------------------------------------------------------------

describe('search()', () => {
  it('returns all 8 entries when called with no options', () => {
    expect(search()).toHaveLength(8);
  });

  it('returns all 8 entries when called with an empty options object', () => {
    expect(search({})).toHaveLength(8);
  });

  it('returns Stripe for query "payment"', () => {
    const results = search({ query: 'payment' });
    const ids = results.map((e) => e.id);
    expect(ids).toContain('stripe');
  });

  it('returns Twilio for query "sms"', () => {
    const results = search({ query: 'sms' });
    const ids = results.map((e) => e.id);
    expect(ids).toContain('twilio');
    expect(ids).not.toContain('stripe');
  });

  it('returns an empty array for query "xyz"', () => {
    expect(search({ query: 'xyz' })).toHaveLength(0);
  });

  it('query matching is case-insensitive', () => {
    const lower = search({ query: 'payment' });
    const upper = search({ query: 'PAYMENT' });
    expect(lower.map((e) => e.id)).toEqual(upper.map((e) => e.id));
  });

  it('returns Slack and Twilio for category "communication"', () => {
    const results = search({ category: 'communication' });
    const ids = results.map((e) => e.id);
    expect(ids).toContain('slack');
    expect(ids).toContain('twilio');
    expect(results).toHaveLength(2);
  });

  it('returns OpenAI for category "ai"', () => {
    const results = search({ category: 'ai' });
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('openai');
  });

  it('returns only OAuth entries for authType "oauth"', () => {
    const results = search({ authType: 'oauth' });
    expect(results.length).toBeGreaterThan(0);
    for (const entry of results) {
      expect(entry.authType).toBe('oauth');
    }
    // Known OAuth entries: slack, hubspot, notion
    const ids = results.map((e) => e.id);
    expect(ids).toContain('slack');
    expect(ids).toContain('hubspot');
    expect(ids).toContain('notion');
  });

  it('combines category and authType filters correctly', () => {
    // communication category has slack (oauth) and twilio (basic)
    const results = search({ category: 'communication', authType: 'oauth' });
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('slack');
  });

  it('combines query and category filters correctly', () => {
    // "messaging" tag belongs to slack, which is in communication
    const results = search({ query: 'messaging', category: 'communication' });
    const ids = results.map((e) => e.id);
    expect(ids).toContain('slack');
  });

  it('returns an empty array when filters match nothing', () => {
    // No AI entries use oauth auth
    expect(search({ category: 'ai', authType: 'oauth' })).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getCategories()
// ---------------------------------------------------------------------------

describe('getCategories()', () => {
  it('returns an array', () => {
    expect(Array.isArray(getCategories())).toBe(true);
  });

  it('returns sorted unique categories', () => {
    const categories = getCategories();
    const sorted = [...categories].sort();
    expect(categories).toEqual(sorted);
  });

  it('contains no duplicates', () => {
    const categories = getCategories();
    const unique = new Set(categories);
    expect(unique.size).toBe(categories.length);
  });

  it('contains all expected categories from the catalog', () => {
    const categories = getCategories();
    const expected = ['ai', 'communication', 'crm', 'demo', 'developer-tools', 'payments', 'productivity'];
    for (const cat of expected) {
      expect(categories).toContain(cat);
    }
  });

  it('returns exactly 7 unique categories', () => {
    expect(getCategories()).toHaveLength(7);
  });
});
