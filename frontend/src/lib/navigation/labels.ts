import type { components } from '@/lib/api/generated';

type MenuTreeNode = components['schemas']['MenuTreeNode'];

const PATH_LABEL_KEYS: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/content': 'content',
  '/content/studio': 'studio',
  '/content/library': 'library',
  '/content/settings': 'settings',
  '/system': 'system',
  '/system/users': 'users',
  '/system/roles': 'roles',
  '/system/menus': 'menus',
};

export function hasMenuLabel(path: string): boolean {
  return path in PATH_LABEL_KEYS;
}

export function menuLabel(node: MenuTreeNode, t: (key: string) => string): string {
  const key = PATH_LABEL_KEYS[node.path];

  return key ? t(key) : node.name;
}
