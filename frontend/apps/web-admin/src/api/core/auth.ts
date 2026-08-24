import type {
  CurrentUserInfo,
  LoginRequest,
  RefreshRequest,
  TokenResponse,
} from './types';

import { baseRequestClient, requestClient } from '#/api/request';

/**
 * 登录
 */
export async function loginApi(data: LoginRequest) {
  return requestClient.post<TokenResponse>('/auth/login', data);
}

/**
 * 刷新访问令牌
 */
export async function refreshTokenApi(data: RefreshRequest) {
  return baseRequestClient.post<TokenResponse>('/auth/refresh', data, {
    withCredentials: true,
  });
}

/**
 * 退出登录
 */
export async function logoutApi() {
  return baseRequestClient.post('/auth/logout', {}, { withCredentials: true });
}

/**
 * 获取当前登录用户信息（含权限码）
 */
export async function getCurrentUserApi() {
  return requestClient.get<CurrentUserInfo>('/auth/me');
}
