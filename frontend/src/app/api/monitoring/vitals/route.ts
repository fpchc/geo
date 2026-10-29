import { NextResponse } from 'next/server';
import { webVitalSchema } from '@/lib/observability/vitals';

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = webVitalSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid web vital' }, { status: 400 });
  }

  const { name, value, rating } = parsed.data;
  console.info(`[web-vitals] ${name}=${value} (${rating ?? 'unknown'})`);

  return new NextResponse(null, { status: 204 });
}
