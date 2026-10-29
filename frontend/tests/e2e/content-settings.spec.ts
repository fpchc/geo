import { expect, type Page, test } from '@playwright/test';

async function login(page: Page, username: string) {
  await page.goto('/login');
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('密码').fill('password');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function openSettings(page: Page, username: string) {
  await login(page, username);
  await page.goto('/content/settings');
  await expect(page.getByRole('heading', { name: '内容设置' })).toBeVisible();
}

test('saves the default prompt and scoring rule', async ({ page }) => {
  await openSettings(page, 'content_ops');

  const prompt = page.getByLabel('默认提示词内容');
  await expect(prompt).not.toHaveValue('');

  const promptValue = `E2E default prompt ${Date.now()}`;
  await prompt.fill(promptValue);
  await page.getByLabel('评分规则 JSON').fill(
    JSON.stringify(
      {
        full_score: 100,
        pass_line: null,
        dimensions: [{ name: 'Keyword coverage', weight: 1, detail: 'E2E dimension' }],
      },
      null,
      2,
    ),
  );

  await page.getByRole('button', { name: '保存设置' }).click();
  await expect(page.getByText('设置已保存。')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('默认提示词内容')).toHaveValue(promptValue);
});

test('is read-only with query-only permission', async ({ page }) => {
  await openSettings(page, 'settings_viewer');

  const prompt = page.getByLabel('默认提示词内容');
  await expect(prompt).toHaveAttribute('readonly');
  await expect(page.getByRole('button', { name: '保存设置' })).toHaveCount(0);
  await expect(page.getByText('当前角色只有查询权限，设置只读。').first()).toBeVisible();
});

test('shows a save failure', async ({ page }) => {
  await openSettings(page, 'content_ops');

  await page.getByLabel('默认提示词内容').fill('save-fail');
  await page.getByRole('button', { name: '保存设置' }).click();

  await expect(page.getByText('Setting update failed')).toBeVisible();
});
