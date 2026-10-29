import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api/config';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/cookies';
import { isSameOrigin } from '@/lib/auth/origin';

const ALLOWED_KEYS = new Set(['content.default_prompt', 'content.scoring_rule']);

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

async function handle(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const key = path.join('/');

  if (!ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ message: 'Setting not found' }, { status: 404 });
  }

  if (request.method !== 'GET' && !isSameOrigin(request)) {
    return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  }

  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const headers = new Headers({
    accept: 'application/json',
    authorization: `Bearer ${accessToken}`,
  });
  const contentType = request.headers.get('content-type');

  if (contentType) {
    headers.set('content-type', contentType);
  }

  const hasBody = request.method === 'PUT';
  const target = `${API_BASE_URL}/content/settings/${encodeURIComponent(key)}`;

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.text() : undefined,
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

export async function GET(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return handle(request, context);
}
