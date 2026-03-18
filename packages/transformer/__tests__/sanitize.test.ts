import { describe, it, expect } from 'vitest';
import {
  sanitizeName,
  pathToSlug,
  generateToolName,
  deduplicateNames,
  sanitizeParamName,
} from '../src/sanitize.js';

describe('sanitizeName', () => {
  it('converts camelCase to lowercase with underscores', () => {
    expect(sanitizeName('listPets')).toBe('listpets');
  });

  it('converts PascalCase to lowercase', () => {
    expect(sanitizeName('ListPets')).toBe('listpets');
  });

  it('converts kebab-case to underscores', () => {
    expect(sanitizeName('list-pets')).toBe('list_pets');
  });

  it('converts spaces to underscores', () => {
    expect(sanitizeName('list pets')).toBe('list_pets');
  });

  it('collapses consecutive underscores', () => {
    expect(sanitizeName('list__pets')).toBe('list_pets');
  });

  it('trims leading and trailing underscores', () => {
    expect(sanitizeName('_list_pets_')).toBe('list_pets');
  });

  it('handles mixed special characters', () => {
    expect(sanitizeName('get/pets/{id}')).toBe('get_pets_id');
  });

  it('handles unicode characters', () => {
    expect(sanitizeName('get_péts')).toBe('get_p_ts');
  });

  it('handles empty string', () => {
    expect(sanitizeName('')).toBe('');
  });

  it('handles all special characters', () => {
    expect(sanitizeName('!!!')).toBe('');
  });

  it('truncates at 64 characters', () => {
    const long = 'a'.repeat(100);
    expect(sanitizeName(long)).toHaveLength(64);
  });

  it('handles dots', () => {
    expect(sanitizeName('api.v1.list_pets')).toBe('api_v1_list_pets');
  });

  it('handles numbers', () => {
    expect(sanitizeName('getV2Pets')).toBe('getv2pets');
  });

  it('handles already valid names', () => {
    expect(sanitizeName('list_pets')).toBe('list_pets');
  });

  it('handles all-digits input', () => {
    expect(sanitizeName('123')).toBe('123');
  });

  it('handles leading digits', () => {
    expect(sanitizeName('1abc')).toBe('1abc');
  });

  it('handles ALLCAPS input', () => {
    expect(sanitizeName('LISTPETS')).toBe('listpets');
  });

  it('handles input at exactly 64 characters', () => {
    const input = 'a'.repeat(64);
    expect(sanitizeName(input)).toHaveLength(64);
  });

  it('handles mixed consecutive special chars', () => {
    expect(sanitizeName('a!!b@@c')).toBe('a_b_c');
  });

  it('handles leading special chars collapsing to underscore', () => {
    expect(sanitizeName('---abc---')).toBe('abc');
  });
});

describe('pathToSlug', () => {
  it('converts simple path', () => {
    expect(pathToSlug('/pets')).toBe('pets');
  });

  it('strips path parameters braces', () => {
    expect(pathToSlug('/pets/{petId}')).toBe('pets_petId');
  });

  it('handles nested path', () => {
    expect(pathToSlug('/pets/{petId}/toys')).toBe('pets_petId_toys');
  });

  it('handles root path', () => {
    expect(pathToSlug('/')).toBe('');
  });

  it('handles multiple params', () => {
    expect(pathToSlug('/orgs/{orgId}/repos/{repoId}')).toBe('orgs_orgId_repos_repoId');
  });
});

describe('generateToolName', () => {
  it('combines method and path slug', () => {
    expect(generateToolName('get', '/pets')).toBe('get_pets');
  });

  it('handles nested paths', () => {
    expect(generateToolName('post', '/pets/{petId}/toys')).toBe('post_pets_petid_toys');
  });
});

describe('deduplicateNames', () => {
  it('returns unique names unchanged', () => {
    expect(deduplicateNames(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('adds numeric suffix to duplicates', () => {
    expect(deduplicateNames(['list_pets', 'list_pets'])).toEqual([
      'list_pets',
      'list_pets_2',
    ]);
  });

  it('handles triple duplicates', () => {
    expect(deduplicateNames(['foo', 'foo', 'foo'])).toEqual(['foo', 'foo_2', 'foo_3']);
  });

  it('handles empty array', () => {
    expect(deduplicateNames([])).toEqual([]);
  });

  it('falls back to unnamed for empty string inputs', () => {
    const result = deduplicateNames(['', '']);
    expect(result).toEqual(['unnamed', 'unnamed_2']);
  });

  it('avoids collision between suffixed name and existing name', () => {
    const result = deduplicateNames(['foo', 'foo_2', 'foo']);
    expect(new Set(result).size).toBe(result.length);
    expect(result[0]).toBe('foo');
    expect(result[1]).toBe('foo_2');
    expect(result[2]).toBe('foo_3');
  });
});

describe('sanitizeParamName', () => {
  it('prefixes reserved name "body"', () => {
    expect(sanitizeParamName('body')).toBe('param_body');
  });

  it('returns non-reserved names unchanged', () => {
    expect(sanitizeParamName('petId')).toBe('petId');
  });
});
