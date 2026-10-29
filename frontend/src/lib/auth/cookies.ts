import type { NextResponse } from 'next/server';
import type { AuthTokens } from './types';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function authCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export function setAuthCookies(response: NextResponse, tokens: AuthTokens): void {
  response.cookies.set(
    ACCESS_TOKEN_COOKIE,
    tokens.access_token,
    authCookieOptions(tokens.expires_in),
  );
  response.cookies.set(
    REFRESH_TOKEN_COOKIE,
    tokens.refresh_token,
    authCookieOptions(REFRESH_MAX_AGE_SECONDS),
  );
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_TOKEN_COOKIE, '', authCookieOptions(0));
  response.cookies.set(REFRESH_TOKEN_COOKIE, '', authCookieOptions(0));
}
