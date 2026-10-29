import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api/config';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/cookies';

const ALLOWED_PATHS = new Set(['overview', 'trends']);

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const endpoint = path[0];

  if (path.length !== 1 || !endpoint || !ALLOWED_PATHS.has(endpoint)) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const target = new URL(`${API_BASE_URL}/dashboard/${endpoint}`);
  target.search = new URL(request.url).search;

  try {
    const response = await fetch(target, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });
    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') ?? 'application/json',
      },
    });
  } catch {
    return NextResponse.json({ message: 'Backend unavailable' }, { status: 502 });
  }
}
