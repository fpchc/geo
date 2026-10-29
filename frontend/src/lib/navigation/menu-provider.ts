import type { SessionUser } from '@/lib/auth/types';
import { getBackendMenuTree } from './backend-nav';
import { NAV_SOURCE } from './config';
import { hasPermission, NAVIGATION } from './registry';
import type { MenuNode, NavDefinition } from './types';

/**
 * Simulated menu provider until the backend exposes a "my menus" endpoint.
 *
 * The returned shape matches what a backend menu tree would provide. Replace
 * this implementation with a GET to `/menus/my` (or an equivalent endpoint)
 * once it exists; the shell and access checks consume only MenuNode.
 */
function filterDefinitions(items: NavDefinition[], session: SessionUser): NavDefinition[] {
  return items.flatMap((item) => {
    if (!hasPermission(session, item.permission)) {
      return [];
    }

    const children = item.children ? filterDefinitions(item.children, session) : undefined;

    if (item.children && (!children || children.length === 0)) {
      return [];
    }

    return [{ ...item, children }];
  });
}

function toMenuNodes(items: NavDefinition[], t: (key: string) => string): MenuNode[] {
  return items.map((item) => ({
    id: item.id,
    label: t(item.labelKey),
    path: item.path,
    icon: item.icon,
    children: item.children ? toMenuNodes(item.children, t) : undefined,
  }));
}

export async function getMenuTree(
  session: SessionUser,
  t: (key: string) => string,
): Promise<MenuNode[]> {
  if (NAV_SOURCE === 'backend') {
    return getBackendMenuTree(t);
  }

  return toMenuNodes(filterDefinitions(NAVIGATION, session), t);
}
