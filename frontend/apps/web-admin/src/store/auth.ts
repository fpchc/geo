import type { Recordable } from '@frontend/types';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { LOGIN_PATH } from '@frontend/constants';
import { preferences } from '@frontend/preferences';
import { resetAllStores, useAccessStore, useUserStore } from '@frontend/stores';

import { ElNotification } from 'element-plus';
import { defineStore } from 'pinia';

import { getCurrentUserApi, loginApi, logoutApi } from '#/api';
import { $t } from '#/locales';

export const useAuthStore = defineStore('auth', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const router = useRouter();

  const loginLoading = ref(false);

  /**
   * 异步处理登录操作
   */
  async function authLogin(
    params: Recordable<any>,
    onSuccess?: () => Promise<void> | void,
  ) {
    let userInfo: null | Recordable<any> = null;
    try {
      loginLoading.value = true;
      const { access_token, refresh_token } = await loginApi({
        password: params.password,
        username: params.username,
      });

      if (access_token) {
        accessStore.setAccessToken(access_token);
        if (refresh_token) {
          accessStore.setRefreshToken(refresh_token);
        }

        const currentUser = await fetchUserInfo();
        userInfo = currentUser as unknown as Recordable<any>;

        if (accessStore.loginExpired) {
          accessStore.setLoginExpired(false);
        } else {
          onSuccess
            ? await onSuccess?.()
            : await router.push(preferences.app.defaultHomePath);
        }

        if (currentUser?.username) {
          ElNotification({
            message: `${$t('authentication.loginSuccessDesc')}:${currentUser.username}`,
            title: $t('authentication.loginSuccess'),
            type: 'success',
          });
        }
      }
    } finally {
      loginLoading.value = false;
    }

    return { userInfo };
  }

  async function logout(redirect: boolean = true) {
    try {
      await logoutApi();
    } catch {
      // 不做任何处理
    }
    resetAllStores();
    accessStore.setLoginExpired(false);

    await router.replace({
      path: LOGIN_PATH,
      query: redirect
        ? { redirect: encodeURIComponent(router.currentRoute.value.fullPath) }
        : {},
    });
  }

  async function fetchUserInfo() {
    const userInfo = await getCurrentUserApi();
    const mapped = {
      avatar: '',
      realName: userInfo.username,
      userId: String(userInfo.user_id),
      username: userInfo.username,
      roles: userStore.userRoles,
      permissions: userInfo.permissions,
    };
    userStore.setUserInfo(mapped);
    // 按钮级权限码走 accessStore.accessCodes（hasAccessByCodes 依赖），需在此接线
    accessStore.setAccessCodes(userInfo.permissions ?? []);
    return mapped;
  }

  function $reset() {
    loginLoading.value = false;
  }

  return {
    $reset,
    authLogin,
    fetchUserInfo,
    loginLoading,
    logout,
  };
});
