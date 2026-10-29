import { expect, test } from '@playwright/test';

async function login(
  page: import('@playwright/test').Page,
  username = 'content_ops',
  password = 'password',
) {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('密码').fill(password);
  await page.getByRole('button', { name: '登录' }).click();
}

test('redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  await expect(page.getByRole('heading', { level: 1, name: '登录' })).toBeVisible();
});

test.describe('login artwork', () => {
  test.use({ reducedMotion: 'reduce' });

  test('renders the split layout at its final state', async ({ page }) => {
    await page.goto('/login');

    const quote = page.getByRole('heading', { level: 2 });
    await expect(quote).toContainText('让内容被模型读懂');
    await expect(quote).toHaveCSS('opacity', '1');
    await expect(page.getByText('面向生成式搜索的内容生产与评审工作台。')).toBeVisible();
    await expect(page.getByText('结构化生成，段落可被独立引用')).toBeVisible();
    await expect(page.getByText('统一评分，持续校准内容质量')).toBeVisible();
    await expect(page.getByText('版本可追溯，反复迭代不丢失')).toBeVisible();
    await expect(page.getByLabel('用户名')).toHaveCSS('height', '38px');
    await expect(page.getByRole('button', { name: '登录' })).toHaveCSS('opacity', '1');
  });
});

test('shows an error for invalid credentials', async ({ page }) => {
  await login(page, 'content_ops', 'wrong-password');

  await expect(page.getByText('用户名或密码错误')).toBeVisible();
});

test('logs in, survives a refresh, and logs out', async ({ page }) => {
  await login(page);

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { level: 1, name: '运营概览' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: '运营概览' })).toBeVisible();

  await page.getByRole('button', { name: '用户菜单' }).click();
  await page.getByRole('button', { name: '退出登录' }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
});

test('refreshes an expired access token once', async ({ page }) => {
  await login(page, 'expired');

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { level: 1, name: '运营概览' })).toBeVisible();
});

test('refreshes an unexpired but rejected access token', async ({ page }) => {
  await login(page, 'stale');

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { level: 1, name: '运营概览' })).toBeVisible();
});

test('returns the current user from the session endpoint', async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { level: 1, name: '运营概览' })).toBeVisible();

  const user = await page.evaluate(async () => {
    const response = await fetch('/api/auth/me');
    return response.json();
  });

  expect(user.username).toBe('content_ops');
});

test('rotates the session through the refresh endpoint', async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { level: 1, name: '运营概览' })).toBeVisible();

  const ok = await page.evaluate(async () => {
    const response = await fetch('/api/auth/refresh', { method: 'POST' });
    return response.ok;
  });

  expect(ok).toBe(true);

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { level: 1, name: '运营概览' })).toBeVisible();
});

test('redirects to login when refresh fails', async ({ page }) => {
  await login(page, 'revoked');

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { level: 1, name: '登录' })).toBeVisible();
});
