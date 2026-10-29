import { expect, type Page, test } from '@playwright/test';

async function loginAsSuperAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('用户名').fill('super_admin');
  await page.getByLabel('密码').fill('password');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto('/system/users');
  await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible();
}

test('protects the current user from destructive actions', async ({ page }) => {
  await loginAsSuperAdmin(page);

  await expect(page.getByRole('button', { name: '删除 super_admin' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '重置密码 super_admin' })).toBeDisabled();
});

test('creates a user, assigns roles, resets the password and deletes it', async ({ page }) => {
  await loginAsSuperAdmin(page);

  await page.getByRole('button', { name: '新建用户' }).click();
  const createDialog = page.getByRole('dialog');
  await createDialog.getByLabel('用户名').fill('qa_user');
  await createDialog.getByLabel('密码').fill('secret123');
  await createDialog.getByLabel('昵称').fill('QA User');
  await createDialog.getByLabel('邮箱').fill('qa@example.com');
  await createDialog.getByLabel('内容查看者').check();
  await createDialog.getByRole('button', { name: '保存' }).click();

  await expect(page.getByText('用户已创建。')).toBeVisible();
  const row = page.getByRole('row', { name: /qa_user/ });
  await expect(row).toBeVisible();

  await page.getByRole('button', { name: '分配角色 qa_user' }).click();
  const rolesDialog = page.getByRole('dialog');
  await rolesDialog.getByLabel('内容运营').check();
  await rolesDialog.getByRole('button', { name: '保存' }).click();

  await expect(page.getByText('角色已更新。')).toBeVisible();
  await expect(row.getByText('内容运营')).toBeVisible();

  await page.getByRole('button', { name: '重置密码 qa_user' }).click();
  const resetDialog = page.getByRole('dialog');
  await resetDialog.getByLabel('新密码').fill('newsecret123');
  await resetDialog.getByLabel('确认密码').fill('newsecret123');
  await resetDialog.getByRole('button', { name: '确认重置' }).click();

  await expect(page.getByText('密码已重置。')).toBeVisible();

  await page.getByRole('button', { name: '删除 qa_user' }).click();
  const deleteDialog = page.getByRole('dialog');
  await deleteDialog.getByRole('button', { name: '确认删除' }).click();

  await expect(page.getByText('用户已删除。')).toBeVisible();
  await expect(page.getByRole('row', { name: /qa_user/ })).toHaveCount(0);
});
