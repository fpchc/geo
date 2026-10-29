import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'test-token' }) }),
}));

const API = 'http://127.0.0.1:7001/api/v1';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('backend navigation source', () => {
  it('loads the navigation tree from GET /menus/tree and maps it', async () => {
    vi.stubEnv('NAV_SOURCE', 'backend');
    vi.resetModules();

    let authorization: string | null = null;

    server.use(
      http.get(`${API}/menus/tree`, ({ request }) => {
        authorization = request.headers.get('authorization');

        return HttpResponse.json({
          code: 0,
          message: 'success',
          data: [
            {
              id: 2,
              name: '内容生产',
              type: 0,
              parent_id: 0,
              ancestors: '0',
              path: '/content',
              icon: 'file-text',
              perm_code: null,
              order_no: 1,
              visible: true,
              children: [
                {
                  id: 11,
                  name: '内容创作',
                  type: 1,
                  parent_id: 2,
                  ancestors: '0,2',
                  path: '/content/studio',
                  icon: null,
                  perm_code: 'content:content:generate',
                  order_no: 1,
                  visible: true,
                  children: [],
                },
              ],
            },
          ],
        });
      }),
    );

    const { getMenuTree } = await import('./menu-provider');
    const menu = await getMenuTree(
      { user_id: 1, username: 'tester', permissions: ['*'] },
      (key) => `label:${key}`,
    );

    expect(authorization).toBe('Bearer test-token');
    expect(menu).toEqual([
      {
        id: '2',
        label: 'label:content',
        icon: 'file-text',
        children: [
          {
            id: '11',
            label: 'label:studio',
            path: '/content/studio',
            icon: undefined,
          },
        ],
      },
    ]);
  });
});
