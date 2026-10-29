import type { SessionUser } from '@/lib/auth/types';
import type { NavDefinition } from './types';

export const NAVIGATION: NavDefinition[] = [
  {
    id: 'dashboard',
    labelKey: 'dashboard',
    path: '/dashboard',
    icon: 'dashboard',
  },
  {
    id: 'content',
    labelKey: 'content',
    icon: 'file',
    children: [
      {
        id: 'studio',
        labelKey: 'studio',
        path: '/content/studio',
        icon: 'pen',
        permission: 'content:content:generate',
      },
      {
        id: 'library',
        labelKey: 'library',
        path: '/content/library',
        icon: 'library',
        permission: 'content:content:list',
      },
      {
        id: 'settings',
        labelKey: 'settings',
        path: '/content/settings',
        icon: 'settings',
        permission: 'content:setting:query',
      },
    ],
  },
  {
    id: 'system',
    labelKey: 'system',
    icon: 'shield',
    children: [
      {
        id: 'users',
        labelKey: 'users',
        path: '/system/users',
        icon: 'users',
        permission: 'system:user:list',
      },
      {
        id: 'roles',
        labelKey: 'roles',
        path: '/system/roles',
        icon: 'shield',
        permission: 'system:role:list',
      },
      {
        id: 'menus',
        labelKey: 'menus',
        path: '/system/menus',
        icon: 'menu',
        permission: 'system:menu:list',
      },
    ],
  },
];

export function hasPermission(session: SessionUser, permission?: string): boolean {
  if (!permission) {
    return true;
  }

  return session.permissions.includes('*') || session.permissions.includes(permission);
}

function findDefinition(items: NavDefinition[], path: string): NavDefinition | undefined {
  for (const item of items) {
    if (item.path === path) {
      return item;
    }

    if (item.children) {
      const found = findDefinition(item.children, path);

      if (found) {
        return found;
      }
    }
  }

  return undefined;
}

export function canAccessPath(session: SessionUser, path: string): boolean {
  const definition = findDefinition(NAVIGATION, path);

  return Boolean(definition && hasPermission(session, definition.permission));
}
