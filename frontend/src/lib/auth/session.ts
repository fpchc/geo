import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { getMe } from '@/lib/api/endpoints';
import { ACCESS_TOKEN_COOKIE } from './cookies';
import { isUnauthorized } from './errors';
import type { SessionUser } from './types';

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return null;
  }

  try {
    const user = await getMe(accessToken);
    return {
      user_id: user.user_id,
      username: user.username,
      permissions: user.permissions,
    };
  } catch (error) {
    if (isUnauthorized(error)) {
      return null;
    }

    throw error;
  }
});
