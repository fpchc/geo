import { expect, type Page, test } from '@playwright/test';

interface WebMetrics {
  cls: number;
  lcp: number;
}

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('用户名').fill('content_ops');
  await page.getByLabel('密码').fill('password');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function measure(page: Page): Promise<WebMetrics> {
  return page.evaluate(
    () =>
      new Promise<WebMetrics>((resolve) => {
        let lcp = 0;
        let cls = 0;
        const lcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            lcp = Math.max(lcp, entry.startTime);
          }
        });
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & {
              hadRecentInput?: boolean;
              value?: number;
            };

            if (!shift.hadRecentInput && typeof shift.value === 'number') {
              cls += shift.value;
            }
          }
        });

        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        clsObserver.observe({ type: 'layout-shift', buffered: true });

        window.setTimeout(() => {
          lcpObserver.disconnect();
          clsObserver.disconnect();
          resolve({ cls, lcp });
        }, 1500);
      }),
  );
}

test('dashboard meets the LCP and CLS budgets', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('heading', { level: 1, name: '运营概览' })).toBeVisible();

  const metrics = await measure(page);

  expect(metrics.lcp).toBeGreaterThan(0);
  expect(metrics.lcp).toBeLessThan(2500);
  expect(metrics.cls).toBeLessThan(0.1);
});

test('content studio meets the LCP and CLS budgets', async ({ page }) => {
  await login(page);
  await page.goto('/content/studio');
  await expect(page.getByRole('heading', { level: 1, name: '内容工作台' })).toBeVisible();

  const metrics = await measure(page);

  expect(metrics.lcp).toBeGreaterThan(0);
  expect(metrics.lcp).toBeLessThan(2500);
  expect(metrics.cls).toBeLessThan(0.1);
});
