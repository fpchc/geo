import { expect, type Page, test } from '@playwright/test';

async function login(page: Page, username: string) {
  await page.goto('/login');
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('密码').fill('password');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test('lists content and keeps filters in the URL', async ({ page }) => {
  await login(page, 'content_ops');
  await page.goto('/content/library');

  await expect(page.getByRole('heading', { name: '内容库' })).toBeVisible();
  await expect(page.getByRole('link', { name: '#2' })).toBeVisible();
  await expect(page.getByRole('link', { name: '#1' })).toBeVisible();

  await page.getByLabel('状态').selectOption('reviewed');

  await expect(page).toHaveURL(/status=reviewed/);
  await expect(page.getByRole('link', { name: '#2' })).toBeVisible();
  await expect(page.getByRole('link', { name: '#1' })).toHaveCount(0);

  await page.reload();
  await expect(page.getByLabel('状态')).toHaveValue('reviewed');
  await expect(page.getByRole('link', { name: '#2' })).toBeVisible();
});

test('opens the detail drawer with body, score and info tabs', async ({ page }) => {
  await login(page, 'content_ops');
  await page.goto('/content/library');

  await expect(page.getByRole('heading', { level: 1, name: '内容库' })).toBeVisible();
  await expect(page.getByText('共 3 篇内容，点击任意一行查看详情。')).toBeVisible();

  await page.getByRole('row', { name: /Generated content 2/ }).click();

  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveCSS('width', '500px');
  await expect(
    drawer.getByRole('heading', { level: 2, name: 'Generated content 2' }),
  ).toBeVisible();
  await expect(drawer.getByRole('tab', { name: '正文' })).toHaveAttribute('aria-selected', 'true');
  await expect(
    drawer.getByRole('heading', { level: 1, name: 'Generated content 2' }),
  ).toBeVisible();

  await drawer.getByRole('tab', { name: '评分' }).click();
  await expect(drawer.getByTestId('score-overall')).toHaveText('85');
  await expect(drawer.getByTestId('score-grade')).toHaveText('A');

  await drawer.getByRole('tab', { name: '信息' }).click();
  await expect(drawer.getByText('内容 ID')).toBeVisible();
  await expect(drawer.getByText('content_ops')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('shows an empty state when no content matches', async ({ page }) => {
  await login(page, 'content_ops');
  await page.goto('/content/library');

  await page.getByLabel('状态').selectOption('configuring');

  await expect(page.getByText('没有符合条件的内容。')).toBeVisible();
});

test('opens content detail with versions and score', async ({ page }) => {
  await login(page, 'content_ops');
  await page.goto('/content/library/2');

  await expect(page.getByRole('heading', { name: '内容 #2' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Generated content 2' })).toBeVisible();
  await expect(page.getByText('版本历史')).toBeVisible();
  await expect(page.getByTestId('current-version-badge')).toHaveText('当前版本');
  await expect(page.getByTestId('score-overall')).toHaveText('85');
  await expect(page.getByTestId('score-grade')).toHaveText('A');
});

test('content_viewer can browse the library and detail read-only', async ({ page }) => {
  await login(page, 'content_viewer');
  await page.goto('/content/library');

  await expect(page.getByRole('link', { name: '#2' })).toBeVisible();

  await page.goto('/content/library/2');

  await expect(page.getByRole('heading', { name: '内容 #2' })).toBeVisible();
  await expect(page.getByTestId('score-overall')).toHaveText('85');
  await expect(page.getByRole('button', { name: '评审' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '生成内容' })).toHaveCount(0);
});
