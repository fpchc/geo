import { bffRequest } from './bff-client';
import type { components } from './generated';

export type MenuType = components['schemas']['MenuType'];
export type MenuCreate = components['schemas']['MenuCreate'];
export type MenuUpdate = components['schemas']['MenuUpdate'];

export type MenuNode = components['schemas']['MenuTreeNode'];

export function getMenuTree(): Promise<MenuNode[]> {
  return bffRequest<MenuNode[]>('system/menus/tree/all');
}

export function createMenu(body: MenuCreate): Promise<MenuNode> {
  return bffRequest<MenuNode>('system/menus', { method: 'POST', body });
}

export function getMenu(id: number): Promise<MenuNode> {
  return bffRequest<MenuNode>(`system/menus/${id}`);
}

export function updateMenu(id: number, body: MenuUpdate): Promise<MenuNode> {
  return bffRequest<MenuNode>(`system/menus/${id}`, { method: 'PUT', body });
}

export function deleteMenu(id: number): Promise<void> {
  return bffRequest<void>(`system/menus/${id}`, { method: 'DELETE' });
}
