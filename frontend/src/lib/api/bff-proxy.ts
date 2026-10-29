import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/cookies';
import { isSameOrigin } from '@/lib/auth/origin';
import { API_BASE_URL } from './config';

export async function proxyJsonRequest(
  request: Request,
  path: string[],
  allowed: RegExp[],
): Promise<NextResponse> {
  const joined = path.join('/');

  if (!allowed.some((pattern) => pattern.test(joined))) {
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

  const hasBody =
    request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'DELETE';

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
