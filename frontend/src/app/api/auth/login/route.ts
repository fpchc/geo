import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError } from '@/lib/api/client';
import { login } from '@/lib/api/endpoints';
import { setAuthCookies } from '@/lib/auth/cookies';
import { isSameOrigin } from '@/lib/auth/origin';

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: 'Username and password are required' }, { status: 400 });
  }

  try {
    const tokens = await login(parsed.data);
    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, tokens);
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.message, code: error.code },
        { status: error.status === 0 ? 502 : error.status >= 400 ? error.status : 401 },
      );
    }

    return NextResponse.json({ message: 'Login failed' }, { status: 500 });
  }
}
