import { expect, test } from '@playwright/test';

test('liveness reports the upstream status', async ({ request }) => {
  const response = await request.get('/api/health');
  const body = await response.json();

  expect(response.ok()).toBe(true);
  expect(body.status).toBe('ok');
  expect(body.upstream).toBe('ok');
});

test('readiness is ready with a healthy upstream', async ({ request }) => {
  const response = await request.get('/api/health/ready');
  const body = await response.json();

  expect(response.ok()).toBe(true);
  expect(body.status).toBe('ready');
});
