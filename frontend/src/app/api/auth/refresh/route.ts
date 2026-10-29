import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { refreshTokens } from '@/lib/api/endpoints';
import { clearAuthCookies, REFRESH_TOKEN_COOKIE, setAuthCookies } from '@/lib/auth/cookies';
import { isSameOrigin } from '@/lib/auth/origin';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  }

  const store = await cookies();
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: 'No session' }, { status: 401 });
  }

  try {
    const tokens = await refreshTokens(refreshToken);
    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, tokens);
    return response;
  } catch {
    const response = NextResponse.json({ message: 'Session expired' }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }
}
