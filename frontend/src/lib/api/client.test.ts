import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw/server';
import { ApiError, request } from './client';
import { getContents, getHealth } from './endpoints';

const API = 'http://127.0.0.1:7001/api/v1';

describe('typed api client', () => {
  it('unwraps BizResponse data', async () => {
    server.use(
      http.get(`${API}/wrapped`, () =>
        HttpResponse.json({ code: 0, message: 'success', data: { ok: true } }),
      ),
    );

    await expect(request<{ ok: boolean }>('/wrapped')).resolves.toEqual({ ok: true });
  });

  it('returns plain JSON responses', async () => {
    await expect(getHealth()).resolves.toEqual({ status: 'ok', version: 'test' });
  });

  it('returns paginated data', async () => {
    const page = await getContents({ page: 1 });

    expect(page.total).toBe(2);
    expect(page.items).toHaveLength(2);
    expect(page.items[0]?.status).toBe('generated');
  });

  it('throws ApiError with the backend code and message', async () => {
    server.use(
      http.get(`${API}/fail`, () =>
        HttpResponse.json({ code: 40001, message: 'bad request' }, { status: 400 }),
      ),
    );

    await expect(request('/fail')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      code: 40001,
      message: 'bad request',
    });
  });

  it('throws ApiError for non-JSON failures', async () => {
    server.use(http.get(`${API}/broken`, () => HttpResponse.text('bad gateway', { status: 502 })));

    await expect(request('/broken')).rejects.toBeInstanceOf(ApiError);
  });
});
