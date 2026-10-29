import { expect, type Page, test } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('用户名').fill('content_ops');
  await page.getByLabel('密码').fill('password');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function openStudio(page: Page) {
  await login(page);
  await page.goto('/content/studio');
  await expect(page.getByRole('heading', { name: '内容工作台' })).toBeVisible();
}

async function fillRequiredFields(page: Page) {
  await page.getByRole('button', { name: /Agent One/ }).click();
  await page.getByPlaceholder('输入关键词后按回车').fill('alpha');
  await page.keyboard.press('Enter');
}

async function openExtraPrompt(page: Page) {
  await page.locator('summary').filter({ hasText: '额外提示词' }).click();
}

test('validates required fields', async ({ page }) => {
  await openStudio(page);

  await page.getByRole('button', { name: '生成内容' }).click();

  await expect(
    page.locator('p.text-destructive').filter({ hasText: '请选择智能体' }),
  ).toBeVisible();
  await expect(
    page.locator('p.text-destructive').filter({ hasText: '至少添加一个关键词' }),
  ).toBeVisible();
});

test('generates content and renders the markdown preview', async ({ page }) => {
  await openStudio(page);
  await fillRequiredFields(page);

  await expect(page.getByRole('button', { name: /Disabled Agent/ })).toHaveCount(0);

  await page.getByLabel('目标受众').selectOption('developers');
  await page.getByRole('button', { name: '生成内容' }).click();

  await expect(page.getByRole('heading', { level: 1, name: /Generated content/ })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText('已生成', { exact: true })).toBeVisible();
});

test('recovers an in-flight task after reload', async ({ page }) => {
  await openStudio(page);
  await fillRequiredFields(page);

  await page.getByRole('button', { name: '生成内容' }).click();
  await expect(page).toHaveURL(/contentId=\d+/);

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: /Generated content/ })).toBeVisible({
    timeout: 20000,
  });
});

test('uploads a material and includes it in generation', async ({ page }) => {
  await openStudio(page);
  await page.getByLabel('参考资料').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hello'),
  });

  await expect(page.getByText('notes.txt')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('5 字符')).toBeVisible();

  await fillRequiredFields(page);
  await page.getByRole('button', { name: '生成内容' }).click();

  await expect(page.getByRole('heading', { level: 1, name: /Generated content/ })).toBeVisible({
    timeout: 15000,
  });
});

test('rejects oversized and unsupported material files', async ({ page }) => {
  await openStudio(page);

  await page.getByLabel('参考资料').setInputFiles({
    name: 'big.txt',
    mimeType: 'text/plain',
    buffer: Buffer.alloc(20 * 1024 * 1024 + 1),
  });
  await expect(page.getByText('文件超过 20MB。')).toBeVisible();

  await page.getByLabel('参考资料').setInputFiles({
    name: 'notes.exe',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('x'),
  });
  await expect(page.getByText('不支持的文件格式。')).toBeVisible();
});

test('reviews generated content and persists the score', async ({ page }) => {
  await openStudio(page);
  await fillRequiredFields(page);
  await page.getByRole('button', { name: '生成内容' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Generated content/ })).toBeVisible({
    timeout: 15000,
  });

  await page.getByRole('button', { name: '评审' }).click();
  await expect(page.getByTestId('score-overall')).toHaveText('85', { timeout: 10000 });
  await expect(page.getByTestId('score-grade')).toHaveText('A');
  await expect(page.getByText('已评审', { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByTestId('score-overall')).toHaveText('85', { timeout: 10000 });
});

test('surfaces a review failure and retries', async ({ page }) => {
  await openStudio(page);
  await fillRequiredFields(page);
  await openExtraPrompt(page);
  await page.getByLabel('额外提示词').fill('review-fail');
  await page.getByRole('button', { name: '生成内容' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Generated content/ })).toBeVisible({
    timeout: 15000,
  });

  await page.getByRole('button', { name: '评审' }).click();
  await expect(page.getByText('服务暂时不可用，请稍后重试。')).toBeVisible({
    timeout: 10000,
  });

  await page.getByRole('button', { name: '重试' }).last().click();
  await expect(page.getByTestId('score-overall')).toHaveText('85', { timeout: 10000 });
  await expect(page.getByText('已评审', { exact: true })).toBeVisible();
});

test('regenerates after review and retains the content', async ({ page }) => {
  await openStudio(page);
  await fillRequiredFields(page);
  await page.getByRole('button', { name: '生成内容' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Generated content/ })).toBeVisible({
    timeout: 15000,
  });

  await page.getByRole('button', { name: '评审' }).click();
  await expect(page.getByTestId('score-overall')).toHaveText('85', { timeout: 10000 });

  await page.getByRole('button', { name: '重新生成' }).click();
  await expect(page.getByText('剩余 9 次')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { level: 1, name: /Generated content/ })).toBeVisible({
    timeout: 15000,
  });

  await page.getByRole('button', { name: '留存' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: '确认留存' })).toBeVisible();
  await dialog.getByRole('button', { name: '确认留存' }).click();

  await expect(page.getByText('已留存', { exact: true }).first()).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole('button', { name: '重新生成' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '留存' })).toHaveCount(0);
});

test('locks at the regeneration limit and only allows retain', async ({ page }) => {
  await openStudio(page);
  await fillRequiredFields(page);
  await openExtraPrompt(page);
  await page.getByLabel('额外提示词').fill('lock-now');
  await page.getByRole('button', { name: '生成内容' }).click();

  await expect(page.getByRole('heading', { level: 1, name: /Generated content/ })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText('已达重新生成上限，只能留存。')).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole('button', { name: '重新生成' })).toBeDisabled();

  await page.getByRole('button', { name: '留存' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '确认留存' }).click();

  await expect(page.getByText('已留存', { exact: true }).first()).toBeVisible({
    timeout: 10000,
  });
});

test('surfaces a generation failure and retries', async ({ page }) => {
  await openStudio(page);
  await fillRequiredFields(page);
  await openExtraPrompt(page);
  await page.getByLabel('额外提示词').fill('generate-fail');

  await page.getByRole('button', { name: '生成内容' }).click();
  await expect(page.getByText('Model generation failed')).toBeVisible({
    timeout: 15000,
  });

  await page.getByRole('button', { name: '重试' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Generated content/ })).toBeVisible({
    timeout: 15000,
  });
});
