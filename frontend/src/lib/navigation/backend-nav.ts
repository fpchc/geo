import 'server-only';
import * as Sentry from '@sentry/nextjs';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { getNavTree } from '@/lib/api/endpoints';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/cookies';
import { hasMenuLabel } from './labels';
import type { BackendMenuTree } from './menu-mapping';
import { collectMenuPaths, mapBackendTree } from './menu-mapping';
import type { MenuNode } from './types';

const reportedMissingLabels = new Set<string>();

function reportMissingLabels(nodes: BackendMenuTree): void {
  for (const node of nodes) {
    if (
      node.type === 1 &&
      node.path &&
      !hasMenuLabel(node.path) &&
      !reportedMissingLabels.has(node.path)
    ) {
      reportedMissingLabels.add(node.path);
      Sentry.captureMessage('navigation.missing_label', {
        level: 'warning',
        extra: { path: node.path, name: node.name },
      });
    }

    reportMissingLabels(node.children ?? []);
  }
}

export const fetchBackendNavTree = cache(async (): Promise<BackendMenuTree> => {
  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return [];
  }

  return getNavTree(accessToken);
});

export async function getBackendMenuTree(t: (key: string) => string): Promise<MenuNode[]> {
  const tree = await fetchBackendNavTree();
  reportMissingLabels(tree);

  return mapBackendTree(tree, t);
}

export const getBackendNavPaths = cache(async (): Promise<Set<string>> => {
  return collectMenuPaths(await fetchBackendNavTree());
});
