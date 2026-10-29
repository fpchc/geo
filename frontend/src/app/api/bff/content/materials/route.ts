import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api/config';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/cookies';
import { isSameOrigin } from '@/lib/auth/origin';
import { validateMaterialFile } from '@/lib/content/material-validation';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  }

  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let form: FormData;

  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ message: 'Invalid form data' }, { status: 400 });
  }

  const file = form.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'Missing file' }, { status: 400 });
  }

  const validation = validateMaterialFile({ name: file.name, size: file.size });

  if (!validation.ok) {
    return NextResponse.json(
      {
        message:
          validation.reason === 'format' ? 'Unsupported file type' : 'File exceeds the 20MB limit',
      },
      { status: 400 },
    );
  }

  const forward = new FormData();
  forward.append('file', file, file.name);

  try {
    const response = await fetch(`${API_BASE_URL}/content/materials`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: forward,
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
