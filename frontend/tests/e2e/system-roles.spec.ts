import { expect, type Page, test } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('用户名').fill('system_admin');
  await page.getByLabel('密码').fill('password');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function openRole(page: Page, name: string) {
  await page.getByRole('button', { name: new RegExp(name) }).click();
}

test('creates a role and assigns menu permissions', async ({ page }) => {
  await login(page);
  await page.goto('/system/roles');
  await expect(page.getByRole('heading', { name: '角色管理' })).toBeVisible();

  await page.getByRole('button', { name: '新建角色' }).click();
  await page.getByLabel('角色 code').fill('e2e_role');
  await page.getByLabel('角色名称').fill('E2E Role');
  await page.getByLabel('描述').fill('created by e2e');
  await page.getByRole('button', { name: '保存' }).click();

  await expect(page.getByText('e2e_role')).toBeVisible();

  await openRole(page, 'E2E Role');
  await page.getByRole('checkbox', { name: '系统管理' }).check();
  await page.getByRole('button', { name: '保存授权' }).click();

  await expect(page.getByText('授权已保存。')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: '系统管理' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: '用户', exact: true })).toBeChecked();
});

test('rejects duplicate role codes', async ({ page }) => {
  await login(page);
  await page.goto('/system/roles');

  await page.getByRole('button', { name: '新建角色' }).click();
  await page.getByLabel('角色 code').fill('super_admin');
  await page.getByLabel('角色名称').fill('Duplicate');
  await page.getByRole('button', { name: '保存' }).click();

  await expect(page.getByText('角色 code 已存在。')).toBeVisible();
});

test('warns before deleting a role', async ({ page }) => {
  await login(page);
  await page.goto('/system/roles');

  await openRole(page, 'E2E Role');
  await page.getByRole('button', { name: '删除角色' }).click();

  await expect(page.getByText('删除后，已绑定该角色的用户将失去对应权限。')).toBeVisible();
  await page.getByRole('button', { name: '取消' }).click();
});
