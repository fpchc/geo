import { expect, type Page, test } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('用户名').fill('content_ops');
  await page.getByLabel('密码').fill('password');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
}

test('shows the hero, KPI cards, status composition and recent content', async ({ page }) => {
  await login(page);

  await expect(page.getByRole('heading', { level: 1, name: '运营概览' })).toBeVisible();
  await expect(page.getByTestId('hero-total')).toHaveText('42', { timeout: 10000 });
  await expect(page.getByTestId('kpi-content-count')).toHaveText('42', { timeout: 10000 });
  await expect(page.getByTestId('kpi-success-rate')).toHaveText('86%');
  await expect(page.getByTestId('kpi-average-score')).toHaveText('82.4');
  await expect(page.getByTestId('kpi-keyword-coverage')).toHaveText('91%');
  await expect(page.getByText('已生成').first()).toBeVisible();
  await expect(page.getByText('最近内容')).toBeVisible();
  await expect(page.getByTestId('trend-chart')).toBeVisible();
  await expect(page.getByTestId('trend-chart').locator('svg').first()).toBeVisible();
});

test('switches the dashboard time range', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: '30 天' }).click();
  await expect(page.getByRole('button', { name: '30 天' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('hero-total')).toHaveText('42', { timeout: 10000 });
});

test('shows empty states when the selected agent has no data', async ({ page }) => {
  await login(page);
  await page.getByLabel('智能体').selectOption('999');

  await expect(page.getByText('所选范围内暂无数据。').first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('所选范围内暂无趋势数据。')).toBeVisible();
  await expect(page.getByText('暂无最近内容。')).toBeVisible();
});

test('shows an error when the dashboard endpoint fails', async ({ page }) => {
  await login(page);
  await page.getByLabel('智能体').selectOption('998');

  await expect(page.getByText('Dashboard unavailable').first()).toBeVisible({
    timeout: 10000,
  });
});
