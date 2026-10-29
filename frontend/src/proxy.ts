import { type NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api/config';
import {
  ACCESS_TOKEN_COOKIE,
  clearAuthCookies,
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
} from '@/lib/auth/cookies';
import { isTokenExpired } from '@/lib/auth/jwt';
import type { AuthTokens } from '@/lib/auth/types';

// Proxy runs outside the server-only API client boundary, so it performs a
// minimal refresh request using the shared base URL and envelope semantics.
const refreshInFlight = new Map<string, Promise<AuthTokens | null>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAuthTokens(value: unknown): value is AuthTokens {
  return (
    isRecord(value) &&
    typeof value.access_token === 'string' &&
    typeof value.refresh_token === 'string' &&
    typeof value.token_type === 'string' &&
    typeof value.expires_in === 'number'
  );
}

function unwrapEnvelope(value: unknown): unknown {
  if (isRecord(value) && typeof value.code === 'number') {
    return value.code === 0 ? value.data : null;
  }

  return value;
}

async function requestRefreshedTokens(refreshToken: string): Promise<AuthTokens | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const tokens = unwrapEnvelope(await response.json());
    return isAuthTokens(tokens) ? tokens : null;
  } catch {
    return null;
  }
}

function refreshTokensOnce(refreshToken: string): Promise<AuthTokens | null> {
  const existing = refreshInFlight.get(refreshToken);

  if (existing) {
    return existing;
  }

  const pending = requestRefreshedTokens(refreshToken).finally(() => {
    refreshInFlight.delete(refreshToken);
  });

  refreshInFlight.set(refreshToken, pending);
  return pending;
}

export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const host = request.headers.get('host') ?? request.nextUrl.host;
  const origin = `${request.nextUrl.protocol}//${host}`;

  if (accessToken && !isTokenExpired(accessToken)) {
    return NextResponse.next();
  }

  if (refreshToken) {
    const tokens = await refreshTokensOnce(refreshToken);

    if (tokens) {
      const response = NextResponse.redirect(
        new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, origin),
      );
      setAuthCookies(response, tokens);
      return response;
    }
  }

  const loginUrl = new URL('/login', origin);
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);

  const response = NextResponse.redirect(loginUrl);
  clearAuthCookies(response);
  return response;
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/content/:path*', '/system/:path*', '/forbidden'],
};
