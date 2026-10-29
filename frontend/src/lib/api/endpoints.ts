import 'server-only';
import type { AuthTokens, SessionUser } from '@/lib/auth/types';
import { request } from './client';
import type { components, paths } from './generated';

export type HealthResponse =
  paths['/api/v1/health']['get']['responses'][200]['content']['application/json'];

export type ContentPage = components['schemas']['PaginatedResponse_ContentOut_'];

export type ContentListQuery = NonNullable<
  paths['/api/v1/content/contents']['get']['parameters']['query']
>;

export type LoginRequest = components['schemas']['LoginRequest'];

export type NavTree = components['schemas']['MenuTreeNode'][];

export function getNavTree(accessToken: string): Promise<NavTree> {
  return request<NavTree>('/menus/tree', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health');
}

export function getContents(query: ContentListQuery = {}): Promise<ContentPage> {
  return request<ContentPage>('/content/contents', { query });
}

export function login(body: LoginRequest): Promise<AuthTokens> {
  return request<AuthTokens>('/auth/login', { method: 'POST', json: body });
}

export function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  return request<AuthTokens>('/auth/refresh', {
    method: 'POST',
    json: { refresh_token: refreshToken },
  });
}

export function logout(accessToken: string): Promise<void> {
  return request<void>('/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getMe(accessToken: string): Promise<SessionUser> {
  return request<SessionUser>('/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
