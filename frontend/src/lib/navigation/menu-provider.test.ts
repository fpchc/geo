import { describe, expect, it } from 'vitest';
import type { SessionUser } from '@/lib/auth/types';
import { getMenuTree } from './menu-provider';
import type { MenuNode } from './types';

function session(permissions: string[]): SessionUser {
  return { user_id: 1, username: 'tester', permissions };
}

const t = (key: string) => key;

function ids(nodes: MenuNode[]): string[] {
  return nodes.map((node) => node.id);
}

function children(nodes: MenuNode[], id: string): string[] {
  return ids(nodes.find((node) => node.id === id)?.children ?? []);
}

describe('getMenuTree', () => {
  it('shows only the read-only library to content_viewer', async () => {
    const menu = await getMenuTree(session(['content:content:list']), t);

    expect(ids(menu)).toEqual(['dashboard', 'content']);
    expect(children(menu, 'content')).toEqual(['library']);
  });

  it('shows all content pages to content_ops', async () => {
    const menu = await getMenuTree(
      session(['content:content:generate', 'content:content:list', 'content:setting:query']),
      t,
    );

    expect(children(menu, 'content')).toEqual(['studio', 'library', 'settings']);
  });

  it('shows only system pages to system_admin', async () => {
    const menu = await getMenuTree(
      session(['system:user:list', 'system:role:list', 'system:menu:list']),
      t,
    );

    expect(ids(menu)).toEqual(['dashboard', 'system']);
    expect(children(menu, 'system')).toEqual(['users', 'roles', 'menus']);
  });

  it('shows every branch to super_admin', async () => {
    const menu = await getMenuTree(session(['*']), t);

    expect(ids(menu)).toEqual(['dashboard', 'content', 'system']);
  });

  it('resolves labels through the provided translator', async () => {
    const menu = await getMenuTree(session(['*']), (key) => `label:${key}`);

    expect(menu[0]?.label).toBe('label:dashboard');
  });
});
