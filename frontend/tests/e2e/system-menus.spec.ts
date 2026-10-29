import { expect, type Page, test } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('用户名').fill('system_admin');
  await page.getByLabel('密码').fill('password');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test('creates a menu with a permission code', async ({ page }) => {
  await login(page);
  await page.goto('/system/menus');
  await expect(page.getByRole('heading', { name: '菜单管理' })).toBeVisible();

  await page.getByRole('button', { name: '新建菜单', exact: true }).click();
  await page.getByLabel('名称').fill('E2E Menu');
  await page.getByLabel('类型').selectOption('1');
  await page.getByLabel('路径').fill('/system/e2e');
  await page.getByLabel('权限码').fill('system:e2e:list');
  await page.getByRole('button', { name: '保存' }).click();

  await expect(page.getByText('E2E Menu')).toBeVisible();
  await expect(page.getByText('system:e2e:list')).toBeVisible();
});

test('edits a menu permission code', async ({ page }) => {
  await login(page);
  await page.goto('/system/menus');

  await page.getByRole('button', { name: '编辑 E2E Menu' }).click();
  await page.getByLabel('权限码').fill('system:e2e:update');
  await page.getByRole('button', { name: '保存' }).click();

  await expect(page.getByText('system:e2e:update')).toBeVisible();
});

test('warns before deleting a menu', async ({ page }) => {
  await login(page);
  await page.goto('/system/menus');

  await page.getByRole('button', { name: '删除 E2E Menu' }).click();
  await expect(page.getByText('删除后，其子菜单与已授权角色中的对应权限会受影响。')).toBeVisible();
  await page.getByRole('button', { name: '取消' }).click();

  await expect(page.getByText('E2E Menu')).toBeVisible();
});
