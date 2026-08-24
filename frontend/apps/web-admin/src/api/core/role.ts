import type {
  AssignMenusRequest,
  PaginatedResponse,
  RoleCreate,
  RoleListParams,
  RoleOut,
  RoleUpdate,
} from './types';

import { requestClient } from '#/api/request';

const BASE = '/roles';

export async function getRoleListApi(params: RoleListParams) {
  return requestClient.get<PaginatedResponse<RoleOut>>(BASE, { params });
}

export async function createRoleApi(data: RoleCreate) {
  return requestClient.post<RoleOut>(BASE, data);
}

export async function getRoleApi(roleId: number) {
  return requestClient.get<RoleOut>(`${BASE}/${roleId}`);
}

export async function updateRoleApi(roleId: number, data: RoleUpdate) {
  return requestClient.put<RoleOut>(`${BASE}/${roleId}`, data);
}

export async function deleteRoleApi(roleId: number) {
  return requestClient.delete(`${BASE}/${roleId}`);
}

export async function assignRoleMenusApi(
  roleId: number,
  data: AssignMenusRequest,
) {
  return requestClient.put<RoleOut>(`${BASE}/${roleId}/menus`, data);
}
