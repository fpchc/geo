import { bffRequest } from './bff-client';
import type { components } from './generated';

export type Role = components['schemas']['RoleOut'];
export type RoleCreate = components['schemas']['RoleCreate'];
export type RoleUpdate = components['schemas']['RoleUpdate'];

export interface RolePage {
  items: Role[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface RoleListQuery {
  code?: string;
  name?: string;
  page?: number;
  page_size?: number;
}

function toQueryString(query: RoleListQuery): string {
  const params = new URLSearchParams();

  if (query.code) {
    params.set('code', query.code);
  }

  if (query.name) {
    params.set('name', query.name);
  }

  if (query.page) {
    params.set('page', String(query.page));
  }

  if (query.page_size) {
    params.set('page_size', String(query.page_size));
  }

  const value = params.toString();

  return value ? `?${value}` : '';
}

export function getRoles(query: RoleListQuery = {}): Promise<RolePage> {
  return bffRequest<RolePage>(`system/roles${toQueryString(query)}`);
}

export function createRole(body: RoleCreate): Promise<Role> {
  return bffRequest<Role>('system/roles', { method: 'POST', body });
}

export function getRole(id: number): Promise<Role> {
  return bffRequest<Role>(`system/roles/${id}`);
}

export function updateRole(id: number, body: RoleUpdate): Promise<Role> {
  return bffRequest<Role>(`system/roles/${id}`, { method: 'PUT', body });
}

export function deleteRole(id: number): Promise<void> {
  return bffRequest<void>(`system/roles/${id}`, { method: 'DELETE' });
}

export function assignRoleMenus(id: number, menuIds: number[]): Promise<Role> {
  return bffRequest<Role>(`system/roles/${id}/menus`, {
    method: 'PUT',
    body: { menu_ids: menuIds },
  });
}
