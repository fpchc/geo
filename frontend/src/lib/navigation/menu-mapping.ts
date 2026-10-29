import type { components } from '@/lib/api/generated';
import { menuLabel } from './labels';
import type { MenuNode } from './types';

export type BackendMenuTree = components['schemas']['MenuTreeNode'][];

export function mapBackendTree(nodes: BackendMenuTree, t: (key: string) => string): MenuNode[] {
  return [...nodes]
    .filter((node) => node.type !== 2 && node.visible !== false)
    .sort((a, b) => a.order_no - b.order_no || a.id - b.id)
    .flatMap((node): MenuNode[] => {
      if (node.type === 0) {
        const children = mapBackendTree(node.children ?? [], t);

        if (children.length === 0) {
          return [];
        }

        return [
          {
            id: String(node.id),
            label: menuLabel(node, t),
            icon: node.icon ?? undefined,
            children,
          },
        ];
      }

      return [
        {
          id: String(node.id),
          label: menuLabel(node, t),
          path: node.path || undefined,
          icon: node.icon ?? undefined,
        },
      ];
    });
}

export function collectMenuPaths(nodes: BackendMenuTree): Set<string> {
  const paths = new Set<string>();

  const walk = (items: BackendMenuTree) => {
    for (const node of items) {
      if (node.type === 1 && node.path) {
        paths.add(node.path);
      }

      walk(node.children ?? []);
    }
  };

  walk(nodes);

  return paths;
}
