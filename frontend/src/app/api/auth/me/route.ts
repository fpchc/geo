import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getMe, refreshTokens } from '@/lib/api/endpoints';
import {
  ACCESS_TOKEN_COOKIE,
  clearAuthCookies,
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
} from '@/lib/auth/cookies';
import { isUnauthorized } from '@/lib/auth/errors';

export async function GET() {
  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    return NextResponse.json(await getMe(accessToken));
  } catch (error) {
    if (!isUnauthorized(error)) {
      return NextResponse.json({ message: 'Backend unavailable' }, { status: 502 });
    }

    const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;

    if (!refreshToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
      const tokens = await refreshTokens(refreshToken);
      const user = await getMe(tokens.access_token);
      const response = NextResponse.json(user);
      setAuthCookies(response, tokens);
      return response;
    } catch {
      const response = NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      clearAuthCookies(response);
      return response;
    }
  }
}
