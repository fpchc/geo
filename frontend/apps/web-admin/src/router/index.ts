import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';

import { resetStaticRoutes } from '@frontend/utils';

import { createRouterGuard } from './guard';
import { routes } from './routes';

/**
 *  @zh_CN 创建vue-router实例
 */
const router = createRouter({
  history:
    import.meta.env.VITE_ROUTER_HISTORY === 'hash'
      ? createWebHashHistory(import.meta.env.VITE_BASE)
      : createWebHistory(import.meta.env.VITE_BASE),
  // 应该添加到路由的初始路由列表。
  routes,
  scrollBehavior: (to, _from, savedPosition) => {
    if (savedPosition) {
      return savedPosition;
    }
    return to.hash ? { behavior: 'smooth', el: to.hash } : { left: 0, top: 0 };
  },
  // 是否应该禁止尾部斜杠。
  // strict: true,
});

const resetRoutes = () => resetStaticRoutes(router, routes);

// 创建路由守卫
createRouterGuard(router);

/**
 * 处理动态导入模块加载失败。
 * 常见于两种场景：
 * 1. 开发模式下 Vite 依赖重新预构建（optimizeDeps）触发整页刷新，
 *    导致进行中的懒加载 chunk 请求中断。
 * 2. 生产环境部署新版本后旧的 chunk hash 失效。
 * 两种情况都通过强制刷新到目标地址恢复，且用 sessionStorage 防止无限刷新循环。
 */
router.onError((error, to) => {
  const message = error?.message ?? '';
  const isDynamicImportError =
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message);

  if (!isDynamicImportError) {
    return;
  }

  const reloadKey = 'router:dynamic-import-reload';
  const targetPath = to?.fullPath ?? window.location.pathname;

  // 防止刷新后仍失败导致的无限循环：同一目标地址只自动刷新一次
  if (sessionStorage.getItem(reloadKey) === targetPath) {
    sessionStorage.removeItem(reloadKey);
    return;
  }

  sessionStorage.setItem(reloadKey, targetPath);
  window.location.assign(targetPath);
});

router.afterEach(() => {
  // 导航成功后清除刷新标记
  sessionStorage.removeItem('router:dynamic-import-reload');
});

export { resetRoutes, router };
