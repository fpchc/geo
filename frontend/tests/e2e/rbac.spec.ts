import { expect, type Page, test } from '@playwright/test';

async function login(page: Page, username: string) {
  await page.goto('/login');
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('密码').fill('password');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test('content_ops sees content navigation and is blocked from system', async ({ page }) => {
  await login(page, 'content_ops');

  await expect(page.getByRole('link', { name: '内容工作台' })).toBeVisible();
  await expect(page.getByRole('link', { name: '内容库' })).toBeVisible();
  await expect(page.getByRole('link', { name: '内容设置' })).toBeVisible();
  await expect(page.getByRole('link', { name: '用户' })).toHaveCount(0);

  await page.goto('/system/users');
  await expect(page).toHaveURL(/\/forbidden/);
  await expect(page.getByText('无权限访问')).toBeVisible();
});

test('content_viewer is read-only', async ({ page }) => {
  await login(page, 'content_viewer');

  await expect(page.getByRole('link', { name: '内容库' })).toBeVisible();
  await expect(page.getByRole('link', { name: '内容工作台' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '内容设置' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '用户' })).toHaveCount(0);

  await page.goto('/content/studio');
  await expect(page).toHaveURL(/\/forbidden/);

  await page.goto('/content/library');
  await expect(page.getByRole('heading', { name: '内容库' })).toBeVisible();
});

test('system_admin sees system navigation only', async ({ page }) => {
  await login(page, 'system_admin');

  await expect(page.getByRole('link', { name: '用户' })).toBeVisible();
  await expect(page.getByRole('link', { name: '角色' })).toBeVisible();
  await expect(page.getByRole('link', { name: '菜单' })).toBeVisible();
  await expect(page.getByRole('link', { name: '内容工作台' })).toHaveCount(0);

  await page.goto('/content/studio');
  await expect(page).toHaveURL(/\/forbidden/);
});

test('super_admin sees every menu', async ({ page }) => {
  await login(page, 'super_admin');

  for (const name of ['内容工作台', '内容库', '内容设置', '用户', '角色', '菜单']) {
    await expect(page.getByRole('link', { name })).toBeVisible();
  }
});

test('unauthenticated users return to the requested page after login', async ({ page }) => {
  await page.goto('/content/library');

  await expect(page).toHaveURL(/\/login\?next=.*content.*library/);

  await page.getByLabel('用户名').fill('content_viewer');
  await page.getByLabel('密码').fill('password');
  await page.getByRole('button', { name: '登录' }).click();

  await expect(page).toHaveURL(/\/content\/library/);
  await expect(page.getByRole('heading', { name: '内容库' })).toBeVisible();
});
