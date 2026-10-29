import { HttpResponse, http } from 'msw';

const API = 'http://127.0.0.1:7001/api/v1';

export const handlers = [
  http.get(`${API}/health`, () => HttpResponse.json({ status: 'ok', version: 'test' })),
  http.get(`${API}/content/contents`, () =>
    HttpResponse.json({
      code: 0,
      message: 'success',
      data: {
        items: [
          {
            id: 1,
            agent_id: 1,
            user_id: 1,
            status: 'generated',
            regen_count: 0,
            current_version_id: 10,
            params: null,
          },
          {
            id: 2,
            agent_id: 1,
            user_id: 1,
            status: 'retained',
            regen_count: 1,
            current_version_id: 11,
            params: null,
          },
        ],
        total: 2,
        page: 1,
        page_size: 20,
        total_pages: 1,
      },
    }),
  ),
];
