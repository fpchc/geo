import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw/server';
import { GET } from './route';

const BACKEND_READY = 'http://127.0.0.1:7001/api/v1/health/ready';

describe('GET /api/health/ready', () => {
  it('is ready when the readiness endpoint reports a healthy upstream', async () => {
    server.use(
      http.get(BACKEND_READY, () =>
        HttpResponse.json({
          status: 'ok',
          components: { database: 'ok', redis: 'ok' },
        }),
      ),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: 'ready',
      upstream: 'ok',
      components: { database: 'ok', redis: 'ok' },
    });
  });

  it('is not ready when the readiness endpoint reports degradation', async () => {
    server.use(
      http.get(BACKEND_READY, () =>
        HttpResponse.json({
          status: 'degraded',
          components: { database: 'ok', redis: 'error' },
        }),
      ),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      status: 'degraded',
      upstream: 'degraded',
      components: { database: 'ok', redis: 'error' },
    });
  });

  it('is not ready when the readiness endpoint fails', async () => {
    server.use(
      http.get(BACKEND_READY, () =>
        HttpResponse.json({ code: 50300, message: 'unavailable' }, { status: 503 }),
      ),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ status: 'degraded', upstream: 'error' });
  });

  it('is not ready when the upstream is unreachable', async () => {
    server.use(http.get(BACKEND_READY, () => HttpResponse.error()));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ status: 'degraded', upstream: 'unreachable' });
  });
});
