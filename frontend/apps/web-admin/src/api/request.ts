/**
 * 该文件可自行根据业务逻辑进行调整
 */
import type { RequestClientOptions } from '@frontend/request';

import { LOGIN_PATH } from '@frontend/constants';
import { useAppConfig } from '@frontend/hooks';
import { preferences } from '@frontend/preferences';
import {
  authenticateResponseInterceptor,
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@frontend/request';
import { useAccessStore } from '@frontend/stores';

import { ElMessage } from 'element-plus';

import { useAuthStore } from '#/store';

import { refreshTokenApi } from './core';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
  });

  /**
   * 重新认证逻辑
   */
  async function doReAuthenticate() {
    console.warn('Access token or refresh token is invalid or expired. ');
    const accessStore = useAccessStore();
    const authStore = useAuthStore();
    accessStore.setAccessToken(null);
    if (
      preferences.app.loginExpiredMode === 'modal' &&
      accessStore.isAccessChecked
    ) {
      accessStore.setLoginExpired(true);
    } else {
      await authStore.logout();
    }
  }

  /**
   * 刷新token逻辑
   */
  async function doRefreshToken() {
    const accessStore = useAccessStore();
    const resp = await refreshTokenApi({
      refresh_token: accessStore.refreshToken ?? '',
    });
    const newToken = resp.access_token;
    accessStore.setAccessToken(newToken);
    if (resp.refresh_token) {
      accessStore.setRefreshToken(resp.refresh_token);
    }
    return newToken;
  }

  function formatToken(token: null | string) {
    return token ? `Bearer ${token}` : null;
  }

  // 请求头处理
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();

      config.headers.Authorization = formatToken(accessStore.accessToken);
      config.headers['Accept-Language'] = preferences.app.locale;
      return config;
    },
  });

  // 处理返回的响应数据格式
  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: 0,
    }),
  );

  // token过期的处理
  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: preferences.app.enableRefreshToken,
      formatToken,
    }),
  );

  // 通用的错误处理,如果没有进入上面的错误处理逻辑，就会进入这里
  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      const isLoginPage = window.location.pathname.includes(LOGIN_PATH);

      // 非登录页：401 由 authenticateResponseInterceptor 静默跳转登录页处理
      if (!isLoginPage && error?.response?.status === 401) {
        return;
      }

      // 登录页的任何错误、或其他页面的非 401 错误：提取后端 message 弹窗提示
      const responseData = error?.response?.data ?? {};
      const detail =
        (Array.isArray(responseData?.detail)
          ? responseData.detail[0]?.msg
          : '') ?? '';
      const backendMessage =
        responseData?.message || responseData?.error || detail || '';
      ElMessage.error(backendMessage || msg);
    }),
  );

  return client;
}

export const requestClient = createRequestClient(apiURL, {
  responseReturn: 'data',
});

export const baseRequestClient = new RequestClient({ baseURL: apiURL });
