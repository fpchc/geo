import { bffRequest } from './bff-client';
import type { components } from './generated';

export type User = components['schemas']['UserOut'];
export type UserCreate = components['schemas']['UserCreate'];
export type UserUpdate = components['schemas']['UserUpdate'];
export type Role = components['schemas']['RoleOut'];
export type UserPage = components['schemas']['PaginatedResponse_UserOut_'];
export type RolePage = components['schemas']['PaginatedResponse_RoleOut_'];

export interface UserListQuery {
  is_active?: boolean;
  page?: number;
  page_size?: number;
  username?: string;
}

function queryString(params: UserListQuery): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') {
      continue;
    }

    query.set(key, String(value));
  }

  return query.toString();
}

export function listUsers(query: UserListQuery = {}): Promise<UserPage> {
  const qs = queryString(query);
  return bffRequest<UserPage>(`system/users${qs ? `?${qs}` : ''}`);
}

export function createUser(body: UserCreate): Promise<User> {
  return bffRequest<User>('system/users', { method: 'POST', body });
}

export function getUser(userId: number): Promise<User> {
  return bffRequest<User>(`system/users/${userId}`);
}

export function updateUser(userId: number, body: UserUpdate): Promise<User> {
  return bffRequest<User>(`system/users/${userId}`, { method: 'PUT', body });
}

export function deleteUser(userId: number): Promise<void> {
  return bffRequest<void>(`system/users/${userId}`, { method: 'DELETE' });
}

export function resetUserPassword(userId: number, newPassword: string): Promise<void> {
  return bffRequest<void>(`system/users/${userId}/password`, {
    method: 'PUT',
    body: { new_password: newPassword },
  });
}

export function assignUserRoles(userId: number, roleIds: number[]): Promise<User> {
  return bffRequest<User>(`system/users/${userId}/roles`, {
    method: 'PUT',
    body: { role_ids: roleIds },
  });
}

export function listRolesForUsers(): Promise<RolePage> {
  return bffRequest<RolePage>('system/users/roles?page=1&page_size=100');
}
