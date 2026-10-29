import { describe, expect, it } from 'vitest';
import type { SessionUser } from '@/lib/auth/types';
import { canAccessPath } from './registry';

function session(permissions: string[]): SessionUser {
  return { user_id: 1, username: 'tester', permissions };
}

describe('canAccessPath', () => {
  it('allows the dashboard to any authenticated user', () => {
    expect(canAccessPath(session([]), '/dashboard')).toBe(true);
  });

  it('allows content_ops into content pages', () => {
    const user = session([
      'content:content:generate',
      'content:content:list',
      'content:setting:query',
    ]);

    expect(canAccessPath(user, '/content/studio')).toBe(true);
    expect(canAccessPath(user, '/content/library')).toBe(true);
    expect(canAccessPath(user, '/content/settings')).toBe(true);
    expect(canAccessPath(user, '/system/users')).toBe(false);
  });

  it('keeps content_viewer out of the studio and system pages', () => {
    const user = session(['content:content:list']);

    expect(canAccessPath(user, '/content/library')).toBe(true);
    expect(canAccessPath(user, '/content/studio')).toBe(false);
    expect(canAccessPath(user, '/system/users')).toBe(false);
  });

  it('allows system_admin into system pages only', () => {
    const user = session(['system:user:list', 'system:role:list', 'system:menu:list']);

    expect(canAccessPath(user, '/system/users')).toBe(true);
    expect(canAccessPath(user, '/system/roles')).toBe(true);
    expect(canAccessPath(user, '/system/menus')).toBe(true);
    expect(canAccessPath(user, '/content/studio')).toBe(false);
  });

  it('allows super_admin everywhere', () => {
    const user = session(['*']);

    expect(canAccessPath(user, '/content/studio')).toBe(true);
    expect(canAccessPath(user, '/system/menus')).toBe(true);
  });

  it('rejects unknown routes', () => {
    expect(canAccessPath(session(['*']), '/not-a-route')).toBe(false);
  });
});
