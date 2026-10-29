import { describe, expect, it } from 'vitest';
import type { MenuNode } from '@/lib/api/menus-client';
import { defaultMenuValues, flattenMenuOptions, isDescendant, menuSchema } from './menu-schema';

const tree: MenuNode[] = [
  {
    id: 1,
    name: 'System',
    type: 0,
    parent_id: 0,
    ancestors: '0',
    path: '/system',
    icon: null,
    perm_code: null,
    order_no: 1,
    visible: true,
    children: [
      {
        id: 2,
        name: 'Users',
        type: 1,
        parent_id: 1,
        ancestors: '0,1',
        path: '/system/users',
        icon: null,
        perm_code: null,
        order_no: 1,
        visible: true,
        children: [
          {
            id: 3,
            name: 'Create user',
            type: 2,
            parent_id: 2,
            ancestors: '0,1,2',
            path: '',
            icon: null,
            perm_code: 'system:user:create',
            order_no: 1,
            visible: true,
          },
        ],
      },
    ],
  },
];

describe('menuSchema', () => {
  it('accepts a menu with a path', () => {
    expect(
      menuSchema.safeParse({
        ...defaultMenuValues,
        name: 'Users',
        type: 1,
        path: '/system/users',
      }).success,
    ).toBe(true);
  });

  it('requires a path for menu nodes', () => {
    expect(
      menuSchema.safeParse({
        ...defaultMenuValues,
        name: 'Users',
        type: 1,
        path: '',
      }).success,
    ).toBe(false);
  });

  it('requires a permission code for buttons', () => {
    expect(
      menuSchema.safeParse({
        ...defaultMenuValues,
        name: 'Create user',
        type: 2,
        perm_code: '',
      }).success,
    ).toBe(false);
  });

  it('validates permission code and path formats', () => {
    expect(
      menuSchema.safeParse({
        ...defaultMenuValues,
        name: 'Users',
        type: 1,
        path: 'system/users',
      }).success,
    ).toBe(false);
    expect(
      menuSchema.safeParse({
        ...defaultMenuValues,
        name: 'Button',
        type: 2,
        perm_code: 'System User',
      }).success,
    ).toBe(false);
  });
});

describe('menu helpers', () => {
  it('flattens options with depth', () => {
    expect(flattenMenuOptions(tree)).toEqual([
      { id: 1, name: 'System', depth: 0 },
      { id: 2, name: 'Users', depth: 1 },
      { id: 3, name: 'Create user', depth: 2 },
    ]);
  });

  it('detects descendants', () => {
    expect(isDescendant(tree, 1, 3)).toBe(true);
    expect(isDescendant(tree, 2, 1)).toBe(false);
  });
});
