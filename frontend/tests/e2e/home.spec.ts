import { expect, type Page, test } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('用户名').fill('content_ops');
  await page.getByLabel('密码').fill('password');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
}

test('redirects unauthenticated visitors from the root to login', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  await expect(page.getByRole('heading', { level: 1, name: '登录' })).toBeVisible();
});

test('redirects authenticated visitors from the root to the dashboard', async ({ page }) => {
  await login(page);

  await page.goto('/');

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1, name: '运营概览' })).toBeVisible();
});
