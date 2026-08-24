import type {
  AssignRolesRequest,
  PaginatedResponse,
  ResetPasswordRequest,
  UserCreate,
  UserListParams,
  UserOut,
  UserUpdate,
} from './types';

import { requestClient } from '#/api/request';

const BASE = '/users';

export async function getUserListApi(params: UserListParams) {
  return requestClient.get<PaginatedResponse<UserOut>>(BASE, { params });
}

export async function createUserApi(data: UserCreate) {
  return requestClient.post<UserOut>(BASE, data);
}

export async function getUserApi(userId: number) {
  return requestClient.get<UserOut>(`${BASE}/${userId}`);
}

export async function updateUserApi(userId: number, data: UserUpdate) {
  return requestClient.put<UserOut>(`${BASE}/${userId}`, data);
}

export async function deleteUserApi(userId: number) {
  return requestClient.delete(`${BASE}/${userId}`);
}

export async function resetUserPasswordApi(
  userId: number,
  data: ResetPasswordRequest,
) {
  return requestClient.put(`${BASE}/${userId}/password`, data);
}

export async function assignUserRolesApi(
  userId: number,
  data: AssignRolesRequest,
) {
  return requestClient.put<UserOut>(`${BASE}/${userId}/roles`, data);
}
