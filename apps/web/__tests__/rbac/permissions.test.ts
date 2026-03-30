import { describe, it, expect } from 'vitest';
import { hasMinRole, ROLE_HIERARCHY } from '../../lib/middleware/rbac';
import type { WorkspaceRole } from '@apifold/types';

describe('RBAC Permissions', () => {
  describe('ROLE_HIERARCHY', () => {
    it('defines correct ordering', () => {
      expect(ROLE_HIERARCHY.viewer).toBeLessThan(ROLE_HIERARCHY.member);
      expect(ROLE_HIERARCHY.member).toBeLessThan(ROLE_HIERARCHY.admin);
      expect(ROLE_HIERARCHY.admin).toBeLessThan(ROLE_HIERARCHY.owner);
    });
  });

  describe('hasMinRole', () => {
    const roles: WorkspaceRole[] = ['viewer', 'member', 'admin', 'owner'];

    it('viewer can view', () => {
      expect(hasMinRole('viewer', 'viewer')).toBe(true);
    });

    it('viewer cannot edit', () => {
      expect(hasMinRole('viewer', 'member')).toBe(false);
    });

    it('viewer cannot admin', () => {
      expect(hasMinRole('viewer', 'admin')).toBe(false);
    });

    it('viewer cannot own', () => {
      expect(hasMinRole('viewer', 'owner')).toBe(false);
    });

    it('member can view and edit', () => {
      expect(hasMinRole('member', 'viewer')).toBe(true);
      expect(hasMinRole('member', 'member')).toBe(true);
    });

    it('member cannot admin or own', () => {
      expect(hasMinRole('member', 'admin')).toBe(false);
      expect(hasMinRole('member', 'owner')).toBe(false);
    });

    it('admin can view, edit, and admin', () => {
      expect(hasMinRole('admin', 'viewer')).toBe(true);
      expect(hasMinRole('admin', 'member')).toBe(true);
      expect(hasMinRole('admin', 'admin')).toBe(true);
    });

    it('admin cannot own', () => {
      expect(hasMinRole('admin', 'owner')).toBe(false);
    });

    it('owner can do everything', () => {
      for (const required of roles) {
        expect(hasMinRole('owner', required)).toBe(true);
      }
    });

    it('every role satisfies its own level', () => {
      for (const role of roles) {
        expect(hasMinRole(role, role)).toBe(true);
      }
    });

    it('no role can exceed its own level', () => {
      for (let i = 0; i < roles.length; i++) {
        for (let j = i + 1; j < roles.length; j++) {
          expect(hasMinRole(roles[i]!, roles[j]!)).toBe(false);
        }
      }
    });
  });
});
