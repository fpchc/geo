import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getSession } from '@/lib/auth/session';
import { getBackendNavPaths } from './backend-nav';
import { NAV_SOURCE } from './config';
import { canAccessPath } from './registry';

export const requireAccess = cache(async (path: string) => {
  const session = await getSession();

  if (!session) {
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }

  const allowed =
    NAV_SOURCE === 'backend'
      ? (await getBackendNavPaths()).has(path)
      : canAccessPath(session, path);

  if (!allowed) {
    redirect('/forbidden');
  }

  return session;
});
