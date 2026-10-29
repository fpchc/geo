import { expect, type Page, test } from '@playwright/test';

async function loginAsSuperAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('用户名').fill('super_admin');
  await page.getByLabel('密码').fill('password');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test('switches to English across the main pages and persists the choice', async ({ page }) => {
  await loginAsSuperAdmin(page);

  await page.getByRole('button', { name: '用户菜单' }).click();
  await page.getByRole('button', { name: 'English' }).click();

  await expect(page.getByRole('link', { name: 'Content studio' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Content library' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Users' })).toBeVisible();

  await page.goto('/content/studio');
  await expect(page.getByRole('heading', { level: 1, name: 'Content studio' })).toBeVisible();

  await page.goto('/content/library');
  await expect(page.getByRole('heading', { level: 1, name: 'Content library' })).toBeVisible();

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();

  await page.goto('/system/users');
  await expect(page.getByRole('heading', { level: 1, name: 'User management' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'User management' })).toBeVisible();

  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByRole('button', { name: '中文' }).click();
  await expect(
    page.getByRole('navigation', { name: '菜单' }).getByRole('link', { name: '用户' }),
  ).toBeVisible();
});
