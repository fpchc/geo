import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw/server';
import { GET } from './route';

const BACKEND_HEALTH = 'http://127.0.0.1:7001/api/v1/health';

describe('GET /api/health', () => {
  it('reports a healthy upstream', async () => {
    server.use(
      http.get(BACKEND_HEALTH, () => HttpResponse.json({ status: 'ok', version: 'test' })),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: 'ok', upstream: 'ok' });
  });

  it('stays live when the upstream is unreachable', async () => {
    server.use(http.get(BACKEND_HEALTH, () => HttpResponse.error()));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: 'ok', upstream: 'unreachable' });
  });
});
