import { describe, expect, it } from 'vitest';
import type { components } from '@/lib/api/generated';
import { collectMenuPaths, mapBackendTree } from './menu-mapping';

type MenuTreeNode = components['schemas']['MenuTreeNode'];

const t = (key: string) => `label:${key}`;

function node(
  partial: Partial<MenuTreeNode> & Pick<MenuTreeNode, 'id' | 'name' | 'type'>,
): MenuTreeNode {
  return {
    id: partial.id,
    name: partial.name,
    type: partial.type,
    parent_id: partial.parent_id ?? 0,
    ancestors: partial.ancestors ?? '0',
    path: partial.path ?? '',
    icon: partial.icon ?? null,
    perm_code: partial.perm_code ?? null,
    order_no: partial.order_no ?? 0,
    visible: partial.visible ?? true,
    children: partial.children,
  };
}

describe('mapBackendTree', () => {
  it('drops buttons and invisible nodes and sorts by order then id', () => {
    const tree = mapBackendTree(
      [
        node({ id: 2, name: 'B', type: 1, path: '/b', order_no: 2 }),
        node({ id: 1, name: 'A', type: 1, path: '/a', order_no: 1 }),
        node({ id: 3, name: 'Button', type: 2, perm_code: 'x:y' }),
        node({ id: 4, name: 'Hidden', type: 1, path: '/hidden', visible: false }),
      ],
      t,
    );

    expect(tree.map((item) => item.id)).toEqual(['1', '2']);
  });

  it('renders directories as groups without a path and keeps menu paths', () => {
    const tree = mapBackendTree(
      [
        node({
          id: 10,
          name: '系统管理',
          type: 0,
          path: '/system',
          children: [
            node({
              id: 11,
              name: '用户管理',
              type: 1,
              path: '/system/users',
              perm_code: 'system:user:list',
            }),
          ],
        }),
      ],
      t,
    );

    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({ id: '10', label: 'label:system' });
    expect(tree[0]?.path).toBeUndefined();
    expect(tree[0]?.children).toEqual([
      {
        id: '11',
        label: 'label:users',
        path: '/system/users',
        icon: undefined,
        children: undefined,
      },
    ]);
  });

  it('drops directories without visible children', () => {
    const tree = mapBackendTree(
      [
        node({
          id: 10,
          name: '空目录',
          type: 0,
          path: '/empty',
          children: [node({ id: 11, name: '按钮', type: 2, perm_code: 'x:y' })],
        }),
      ],
      t,
    );

    expect(tree).toEqual([]);
  });

  it('falls back to the backend name when no translation key matches', () => {
    const tree = mapBackendTree([node({ id: 20, name: '未知菜单', type: 1, path: '/unknown' })], t);

    expect(tree[0]?.label).toBe('未知菜单');
  });
});

describe('collectMenuPaths', () => {
  it('collects only menu paths, ignoring directories and buttons', () => {
    const paths = collectMenuPaths([
      node({
        id: 10,
        name: '系统管理',
        type: 0,
        path: '/system',
        children: [
          node({
            id: 11,
            name: '用户管理',
            type: 1,
            path: '/system/users',
            children: [node({ id: 12, name: '新增', type: 2, perm_code: 'system:user:create' })],
          }),
        ],
      }),
      node({ id: 20, name: '内容', type: 0, path: '/content' }),
    ]);

    expect([...paths]).toEqual(['/system/users']);
  });
});
