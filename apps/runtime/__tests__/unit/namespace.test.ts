import { describe, it, expect } from 'vitest';
import { prefixToolName, stripNamespace, isNamespaced, NAMESPACE_SEPARATOR } from '../../src/mcp/namespace.js';

describe('namespace', () => {
  describe('prefixToolName', () => {
    it('prefixes a tool name with namespace', () => {
      expect(prefixToolName('stripe', 'listCharges')).toBe('stripe__listCharges');
    });

    it('handles underscores in namespace', () => {
      expect(prefixToolName('my_api', 'getUser')).toBe('my_api__getUser');
    });
  });

  describe('stripNamespace', () => {
    it('extracts namespace and tool name', () => {
      const result = stripNamespace('stripe__listCharges');
      expect(result).toEqual({ namespace: 'stripe', toolName: 'listCharges' });
    });

    it('returns null for non-namespaced names', () => {
      expect(stripNamespace('listCharges')).toBeNull();
    });

    it('handles tool names with underscores', () => {
      const result = stripNamespace('github__list_repos');
      expect(result).toEqual({ namespace: 'github', toolName: 'list_repos' });
    });

    it('uses first separator only', () => {
      const result = stripNamespace('ns__tool__extra');
      expect(result).toEqual({ namespace: 'ns', toolName: 'tool__extra' });
    });
  });

  describe('isNamespaced', () => {
    it('returns true for namespaced names', () => {
      expect(isNamespaced('stripe__listCharges')).toBe(true);
    });

    it('returns false for plain names', () => {
      expect(isNamespaced('listCharges')).toBe(false);
    });
  });

  it('exports the separator constant', () => {
    expect(NAMESPACE_SEPARATOR).toBe('__');
  });
});
