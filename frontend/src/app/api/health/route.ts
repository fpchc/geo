import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api/config';

interface BackendHealth {
  status?: string;
  version?: string;
}

export async function GET() {
  const started = Date.now();

  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    const body = (await response.json().catch(() => null)) as BackendHealth | null;
    const upstream = response.ok ? (body?.status ?? 'ok') : 'error';

    return NextResponse.json({
      status: 'ok',
      upstream,
      latencyMs: Date.now() - started,
    });
  } catch {
    return NextResponse.json({
      status: 'ok',
      upstream: 'unreachable',
      latencyMs: Date.now() - started,
    });
  }
}
