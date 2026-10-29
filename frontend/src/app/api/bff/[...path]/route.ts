import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api/config';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/cookies';
import { isSameOrigin } from '@/lib/auth/origin';

const ALLOWED_PATHS = [
  /^content\/agents$/,
  /^content\/agents\/\d+$/,
  /^content\/contents$/,
  /^content\/contents\/creation-options$/,
  /^content\/contents\/generate$/,
  /^content\/contents\/tasks\/[A-Za-z0-9_-]+$/,
  /^content\/contents\/\d+$/,
  /^content\/contents\/\d+\/regenerate$/,
  /^content\/contents\/\d+\/review$/,
  /^content\/contents\/\d+\/score$/,
  /^content\/contents\/\d+\/retain$/,
  /^content\/contents\/\d+\/versions$/,
];

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

function isAllowed(path: string): boolean {
  return ALLOWED_PATHS.some((pattern) => pattern.test(path));
}

async function handle(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const joined = path.join('/');

  if (!isAllowed(joined)) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  if (request.method !== 'GET' && !isSameOrigin(request)) {
    return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  }

  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const target = new URL(`${API_BASE_URL}/${joined}`);
  target.search = new URL(request.url).search;

  const headers = new Headers({
    accept: 'application/json',
    authorization: `Bearer ${accessToken}`,
  });
  const contentType = request.headers.get('content-type');
  const idempotencyKey = request.headers.get('x-idempotency-key');

  if (contentType) {
    headers.set('content-type', contentType);
  }

  if (idempotencyKey) {
    headers.set('x-idempotency-key', idempotencyKey);
  }

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

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

export async function POST(request: Request, context: RouteContext) {
  return handle(request, context);
}
