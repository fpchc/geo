---
description: 权限与访问控制规范 - 加权限、控制菜单/按钮可见性、动态路由时加载
---

# 11 · 权限 / 访问控制约束

> 依据 `packages/effects/access/src`、`apps/web-admin/src/router/{guard,access}.ts`、`packages/@core/base/typings/src/vue-router.d.ts`。当前 `accessMode = 'frontend'`。

## 1. 两种菜单模式

由 `preferences.app.accessMode` 决定，可用 `useAccess().toggleAccessMode()` 切换：

| 模式 | 值 | 路由/菜单来源 | 权限判定 |
| --- | --- | --- | --- |
| **前端模式**（当前） | `'frontend'` | `router/routes/modules/*.ts` 静态定义，按 `meta.authority`(角色) 过滤 | `hasAccessByRoles` |
| 后端模式（待接入） | `'backend'` | 后端返回菜单树（`getMenuNavTreeApi`） | `hasAccessByCodes`（权限码） |

`access.ts` 的 `generateAccess` 已同时接好两种模式（`fetchMenuListAsync` 拉后端菜单，`pageMap` glob 本地页面组件）。切后端模式时无需改业务代码，改 `accessMode` 即可。

## 2. 路由守卫权限拦截（已配好，勿重写）

`router/guard.ts` 的 `setupAccessGuard` 流程：
1. core 路由（登录/404 等）免拦截；已登录访问登录页 → 重定向首页。
2. 无 `accessToken` → 跳登录页（带 `redirect`），除非 `meta.ignoreAccess === true`。
3. 已登录且未生成动态路由 → 调 `generateAccess` 按角色生成菜单+路由并注入。

**业务侧只需**：在路由 `meta` 声明权限，其余交给守卫。

## 3. 路由级权限（meta 权限字段）

完整字段见 `RouteMeta`（`@core/base/typings/src/vue-router.d.ts`）。权限相关：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `authority` | `string[]` | 需要的角色标识，前端模式下按此过滤菜单/路由 |
| `ignoreAccess` | boolean | 忽略登录鉴权，未登录也可访问（如公开页） |
| `menuVisibleWithForbidden` | boolean | 菜单可见但访问被重定向到 403 |
| `hideInMenu` / `hideChildrenInMenu` / `hideInBreadcrumb` / `hideInTab` | boolean | 各处隐藏控制 |

示例：
```ts
{
  name: 'SystemUser',
  path: '/system/user',
  component: () => import('#/views/_core/system/user.vue'),
  meta: {
    title: $t('page.system.user'),
    icon: 'lucide:users',
    authority: ['admin', 'system'], // 只有这些角色可见/可访问
  },
}
```

## 4. 按钮级权限

### 方式一：`v-access` 指令（推荐，DOM 级移除）

无权限时元素直接从 DOM 移除：
```vue
<!-- 按角色（frontend 模式） -->
<ElButton v-access:role="['admin']">删除</ElButton>
<ElButton v-access:role="'admin'">删除</ElButton>

<!-- 按权限码（backend 模式 / 细粒度） -->
<ElButton v-access:code="['system:user:delete']">删除</ElButton>
```
- `v-access:role` → 走 `hasAccessByRoles`；`v-access:code` → 走 `hasAccessByCodes`。
- frontend 模式且 `arg==='role'` 用角色判定，否则用权限码判定。
- 指令已全局注册（`registerAccessDirective`），直接用。

### 方式二：`useAccess()` composable（逻辑判断）

```ts
import { useAccess } from '@frontend/access';

const { hasAccessByRoles, hasAccessByCodes, accessMode } = useAccess();

if (hasAccessByCodes(['system:user:edit'])) {
  // 有权限才执行
}
```

### 方式三：`AccessControl` 组件（包裹式）

```vue
<script setup>
import { AccessControl } from '@frontend/access';
</script>
<template>
  <AccessControl :codes="['admin']" type="role">
    <ElButton>仅管理员可见</ElButton>
  </AccessControl>
  <AccessControl :codes="['system:user:delete']" type="code">
    <ElButton>删除</ElButton>
  </AccessControl>
</template>
```
`type` 默认 `'role'`，可选 `'code'`。

## 5. 权限数据来源

- **角色** `userStore.userRoles`：登录后 `fetchUserInfo` 写入（auth store）。
- **权限码** `accessStore.accessCodes`：后端返回的 `permissions`（见 `CurrentUserInfo.permissions`，`/auth/me`）。
- 登出用 `resetAllStores()` 清空（见 auth store `logout`）。

## 相关规范

- 路由 meta 完整字段 → `02-router-meta.md`
- 登录/用户信息接口 → `03-api-request.md`
- store 使用 → `04-state-pinia.md`
