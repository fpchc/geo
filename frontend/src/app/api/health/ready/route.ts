import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api/config';

interface BackendReadiness {
  status?: string;
  components?: Record<string, string>;
}

export async function GET() {
  const started = Date.now();

  try {
    const response = await fetch(`${API_BASE_URL}/health/ready`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    const body = (await response.json().catch(() => null)) as BackendReadiness | null;
    const components = body?.components ?? {};

    if (!response.ok || body?.status !== 'ok') {
      return NextResponse.json(
        {
          status: 'degraded',
          upstream: response.ok ? (body?.status ?? 'unknown') : 'error',
          components,
          latencyMs: Date.now() - started,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: 'ready',
      upstream: 'ok',
      components,
      latencyMs: Date.now() - started,
    });
  } catch {
    return NextResponse.json(
      {
        status: 'degraded',
        upstream: 'unreachable',
        latencyMs: Date.now() - started,
      },
      { status: 503 },
    );
  }
}
