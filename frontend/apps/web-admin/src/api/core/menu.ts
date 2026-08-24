import type { MenuCreate, MenuOut, MenuUpdate } from './types';

import { requestClient } from '#/api/request';

const BASE = '/menus';

/**
 * 导航菜单树（剔除按钮，用于左侧菜单渲染）
 */
export async function getMenuNavTreeApi() {
  return requestClient.get<Record<string, any>[]>(`${BASE}/tree`);
}

/**
 * 授权菜单树（全量，含按钮节点的 perm_code，用于角色授权配置）
 */
export async function getMenuFullTreeApi() {
  return requestClient.get<Record<string, any>[]>(`${BASE}/tree/all`);
}

export async function getMenuApi(menuId: number) {
  return requestClient.get<MenuOut>(`${BASE}/${menuId}`);
}

export async function createMenuApi(data: MenuCreate) {
  return requestClient.post<MenuOut>(BASE, data);
}

export async function updateMenuApi(menuId: number, data: MenuUpdate) {
  return requestClient.put<MenuOut>(`${BASE}/${menuId}`, data);
}

export async function deleteMenuApi(menuId: number) {
  return requestClient.delete(`${BASE}/${menuId}`);
}
