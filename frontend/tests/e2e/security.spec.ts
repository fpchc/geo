import { expect, test } from '@playwright/test';

test('sets baseline security headers', async ({ page }) => {
  const response = await page.goto('/');
  const headers = response?.headers() ?? {};

  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toContain('camera=()');
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['content-security-policy']).toContain("object-src 'none'");
});

test('reports web vitals', async ({ page }) => {
  const vitalRequests: string[] = [];

  page.on('response', (response) => {
    if (response.url().includes('/api/monitoring/vitals')) {
      vitalRequests.push(response.url());
    }
  });

  await page.goto('/');

  await expect.poll(() => vitalRequests.length).toBeGreaterThan(0);
});
