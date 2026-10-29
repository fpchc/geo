import { expect, type Page, test } from '@playwright/test';

async function login(page: Page, username = 'super_admin') {
  await page.goto('/login');
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('密码').fill('password');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test('theme choice persists on login and inside the shell', async ({ page }) => {
  await page.goto('/login');
  const html = page.locator('html');

  await page.getByRole('button', { name: '切换主题' }).click();
  await expect(html).toHaveClass(/dark/);

  await page.reload();
  await expect(html).toHaveClass(/dark/);

  await login(page);
  await expect(html).toHaveClass(/dark/);

  await page.getByRole('button', { name: '切换主题' }).click();
  await expect(html).not.toHaveClass(/dark/);

  await page.reload();
  await expect(html).not.toHaveClass(/dark/);
});

test('dialogs, the library drawer and the user menu close with Escape', async ({ page }) => {
  await login(page);

  await page.goto('/system/users');
  const createButton = page.getByRole('button', { name: '新建用户' });
  await createButton.click();
  const createDialog = page.getByRole('dialog');
  await expect(createDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(createDialog).not.toBeVisible();

  await page.goto('/content/library');
  const firstRow = page.locator('tbody tr').first();
  await firstRow.focus();
  await page.keyboard.press('Enter');
  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();

  const userMenu = page.getByRole('button', { name: '用户菜单' });
  await userMenu.click();
  await expect(userMenu).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(userMenu).toHaveAttribute('aria-expanded', 'false');
});

test('keyboard drives generation, review, save and delete confirmation', async ({ page }) => {
  await login(page, 'content_ops');
  await page.goto('/content/studio');

  const agent = page.getByRole('button', { name: /Agent One/ });
  await agent.focus();
  await page.keyboard.press('Enter');

  const keyword = page.getByPlaceholder('输入关键词后按回车');
  await keyword.focus();
  await keyword.fill('alpha');
  await page.keyboard.press('Enter');

  const generate = page.getByRole('button', { name: '生成内容' });
  await generate.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: /Generated content/ })).toBeVisible({
    timeout: 15000,
  });

  const review = page.getByRole('button', { name: '评审' });
  await review.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('score-overall')).toHaveText('85', { timeout: 10000 });

  await page.goto('/content/settings');
  const save = page.getByRole('button', { name: '保存设置' });
  await save.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('设置已保存。')).toBeVisible();

  await page.goto('/dashboard');
  await page.getByRole('button', { name: '用户菜单' }).click();
  await page.getByRole('button', { name: '退出登录' }).click();
  await expect(page).toHaveURL(/\/login/);

  await login(page);
  await page.goto('/system/users');
  const deleteButton = page.getByRole('button', { name: '删除 content_ops' });
  await deleteButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('focus ring is visible on permission checkboxes', async ({ page }) => {
  await login(page);
  await page.goto('/system/roles');

  const checkbox = page.getByRole('checkbox', { name: '系统管理' });
  await checkbox.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(checkbox).toBeFocused();

  const outline = await checkbox.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });

  expect(outline.style).not.toBe('none');
  expect(outline.width).toBeGreaterThanOrEqual(2);
});

test.describe('390px viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('keeps content editing read-only', async ({ page }) => {
    await login(page, 'content_ops');

    await page.goto('/content/studio');
    await expect(page.getByText('移动端仅支持查看，请在桌面端编辑内容。')).toBeVisible();
    await expect(page.getByRole('button', { name: /Agent One/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: '生成内容' })).toBeDisabled();

    await page.goto('/content/settings');
    await expect(page.getByText('移动端仅支持查看，请在桌面端修改配置。').first()).toBeVisible();
    await expect(page.getByLabel('默认提示词内容')).not.toBeEditable();
    await expect(page.getByLabel('评分规则 JSON')).not.toBeEditable();
  });

  test('keeps dialogs and the library drawer inside the viewport', async ({ page }) => {
    await login(page);

    await page.goto('/system/users');
    await page.getByRole('button', { name: '新建用户' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((dialogBox?.x ?? 0) + (dialogBox?.width ?? 0)).toBeLessThanOrEqual(390);
    expect(dialogBox?.height ?? 0).toBeLessThanOrEqual(844);
    await page.keyboard.press('Escape');

    await page.goto('/content/library');
    await page.locator('tbody tr').first().click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await page.waitForTimeout(600);
    const drawerBox = await drawer.boundingBox();
    expect(drawerBox).not.toBeNull();
    expect(drawerBox?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((drawerBox?.x ?? 0) + (drawerBox?.width ?? 0)).toBeLessThanOrEqual(390);
  });

  test('has no horizontal page overflow', async ({ page }) => {
    const pages = [
      ['/dashboard', '运营概览'],
      ['/content/studio', '内容工作台'],
      ['/content/library', '内容库'],
      ['/content/settings', '内容设置'],
      ['/system/users', '用户管理'],
      ['/system/roles', '角色管理'],
      ['/system/menus', '菜单管理'],
    ] as const;

    await page.goto('/login');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(1);

    await login(page);
    for (const [path, heading] of pages) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(1);
    }
  });
});

test('reduced motion lands on final states without transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await login(page, 'content_ops');

  await expect(page.getByTestId('hero-total')).toHaveText('42');
  const state = await page.evaluate(() => {
    const button = document.querySelector('button');
    const line = document.querySelector('.chart-line');
    return {
      reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      transition: button ? getComputedStyle(button).transitionDuration : '',
      strokeDashoffset: line ? getComputedStyle(line).strokeDashoffset : '',
    };
  });

  expect(state.reduced).toBe(true);
  expect(state.transition).toBe('0s');
  expect(['0px', '0']).toContain(state.strokeDashoffset);
});
