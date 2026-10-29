import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { logout } from '@/lib/api/endpoints';
import { ACCESS_TOKEN_COOKIE, clearAuthCookies } from '@/lib/auth/cookies';
import { isSameOrigin } from '@/lib/auth/origin';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  }

  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;

  if (accessToken) {
    try {
      await logout(accessToken);
    } catch {
      // Clear the local session even if the backend session is already gone.
    }
  }

  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
