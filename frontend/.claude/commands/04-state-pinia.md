---
description: Pinia store 定义与在非组件中使用 store 的规范 - 新增/使用状态时加载
---

# 04 · 状态管理（Pinia）约束

> 依据 `apps/web-admin/src/store/auth.ts` 真实代码。

## ⚠️ 风格说明（重要）

CLAUDE.md 与 `.ai/memory.md` 记载「Pinia 使用 Options API 风格」，**但真实代码 `store/auth.ts` 使用的是 Setup（Composition）风格**：

```ts
export const useAuthStore = defineStore('auth', () => { ... });
```

**约定以真实代码为准：新写 store 统一用 Setup 风格**（与现有 auth store 一致，避免混用）。如果团队坚持 Options 风格，请先统一改造现有 store 并同步更新 CLAUDE.md，不要两种风格并存。

## 1. Store 标准骨架（Setup 风格）

```ts
import type { Recordable } from '@frontend/types';

import { ref } from 'vue';

import { defineStore } from 'pinia';

import { someApi } from '#/api';

export const useAuthStore = defineStore('auth', () => {
  // 1. 依赖的其他 store（在 setup 顶部直接调用即可，此时 pinia 已激活）
  const accessStore = useAccessStore();

  // 2. state：用 ref/reactive
  const loginLoading = ref(false);

  // 3. actions：普通 async / function
  async function authLogin(params: Recordable<any>) {
    loginLoading.value = true;
    try {
      // ...
    } finally {
      loginLoading.value = false;
    }
  }

  // 4. $reset：Setup 风格需手动实现重置逻辑
  function $reset() {
    loginLoading.value = false;
  }

  // 5. 必须显式 return 暴露的 state 和 actions
  return { $reset, authLogin, loginLoading };
});
```

## 2. 命名与位置

- 文件：`store/<域>.ts`，如 `store/auth.ts`。
- id：`defineStore('auth', ...)` 用小写域名，与文件名一致。
- 组合式函数名：`use<Pascal>Store`，如 `useAuthStore`。
- app 私有 store 放 `apps/*/src/store/`，`store/index.ts` 统一 `export *`。
- **通用 store**（accessStore / userStore）来自 `@frontend/stores`，不要在 app 内重复定义，直接 `import { useAccessStore, useUserStore } from '@frontend/stores'`。

## 3. 在非组件环境中使用 store

在路由守卫、请求拦截器、工具函数等 **非 Vue 组件** 上下文里，store 必须在函数内部调用，不能在模块顶层调用（模块加载时 pinia 尚未 install）。

真实示例——请求拦截器 `api/request.ts`：
```ts
import { useAccessStore } from '@frontend/stores';

client.addRequestInterceptor({
  fulfilled: async (config) => {
    const accessStore = useAccessStore(); // ✅ 在回调内部调用
    config.headers.Authorization = formatToken(accessStore.accessToken);
    return config;
  },
});
```

路由守卫 `router/guard.ts`：
```ts
router.beforeEach(async (to, from) => {
  const accessStore = useAccessStore(); // ✅ 守卫回调内部
  const authStore = useAuthStore();
  // ...
});
```

**错误示范**（模块顶层调用，会因 pinia 未激活报错）：
```ts
const accessStore = useAccessStore(); // ❌ 顶层直接调用
export function foo() { return accessStore.token; }
```

## 4. 重置

- 全局登出用 `resetAllStores()`（来自 `@frontend/stores`），会重置所有 store，见 auth store 的 `logout()`。
- Setup 风格 store 需自行实现 `$reset()` 供 `resetAllStores` 调用。

## 相关规范

- 请求拦截器里用 store → `03-api-request.md`
- 守卫里用 store → `02-router-meta.md` / `11-access-control.md`
