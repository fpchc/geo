---
description: 路由定义与 meta 字段规范 - 新增/修改路由、配置菜单时加载
---

# 02 · 路由与 meta 约束

> 依据 `apps/web-admin/src/router` 真实代码。当前 `accessMode = 'frontend'`（前端菜单模式），后端菜单模式待接入。

## 1. 路由模块标准模板

业务路由放 `router/routes/modules/<模块>.ts`，通过 `import.meta.glob('./modules/**/*.ts')` 自动收集（见 `routes/index.ts`）。每个模块 `export default` 一个 `RouteRecordRaw[]`：

```ts
import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    // 一级：目录节点，只有 meta + children，component 由布局自动接管
    meta: {
      icon: 'lucide:settings',
      order: 1,
      title: $t('page.system.title'), // 必须走 i18n，禁止硬编码中文
    },
    name: 'System',
    path: '/system',
    redirect: '/system/user',
    children: [
      {
        name: 'SystemUser',                 // PascalCase，全局唯一
        path: '/system/user',
        component: () => import('#/views/_core/system/user.vue'), // 懒加载
        meta: {
          icon: 'lucide:users',
          title: $t('page.system.user'),
        },
      },
    ],
  },
];

export default routes;
```

**硬性规则**：
- `name` 用 PascalCase，全局唯一，且必须与页面组件 `defineOptions({ name })` **完全一致**（KeepAlive 靠 name 缓存）。
- `component` 一律 `() => import('#/views/...')` 懒加载，禁止静态 import。
- `title` 必须 `$t(...)`，禁止写死文案。
- **不要**把业务路由放进 `router/routes/core.ts`——core 路由会绕过登录鉴权守卫（历史踩坑：System 曾误放 core.ts 造成越权，已迁至 modules）。需要鉴权的路由放 `modules/`。

## 2. meta 字段字典

真实项目中出现和守卫消费的字段（来自 dashboard.ts / system.ts / guard.ts）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `title` | string | 菜单/标签标题，走 `$t()` |
| `icon` | string | 图标名，格式 `集合:名称`，项目用 `lucide:*`（如 `lucide:users`） |
| `order` | number | 菜单排序，越小越靠前；dashboard 用 `-1` 置顶 |
| `affixTab` | boolean | 固定标签页（不可关闭），dashboard 用 `true` |
| `redirect` | — | 目录节点重定向到首个子路由 |
| `ignoreAccess` | boolean | 忽略登录鉴权，未登录也可访问（guard.ts 消费） |
| `loaded` | boolean | 守卫内部标记页面是否已加载（自动维护，勿手写） |

> 完整可用字段（hideInMenu / keepAlive / authority / badge / activeIcon 等）以 `@frontend/types` 的 `RouteMeta` 定义为准，见 `11-access-control.md` 的权限字段说明。新增字段前先查该类型，不要臆造。

## 3. 路由拍平与 KeepAlive（硬约束）

- **三级以上路由自动拍平为二级**：这是 Vben 布局对 KeepAlive 的限制。设计路由树时，业务层级不要超过「目录 → 页面」两层；更深的分组用 path 前缀表达，而非嵌套 children。
- KeepAlive 缓存以路由 `name` 为 key，因此 `name` 必须唯一且与组件 name 一致，否则缓存错乱或失效。

## 4. 核心 / 动态 / 静态路由分类

`routes/index.ts` 的装配逻辑：
- `coreRoutes`（`routes/core.ts`）+ `fallbackNotFoundRoute` → 免鉴权基础路由，恒在。
- `accessRoutes` = `dynamicRoutes`（modules 收集）+ `staticRoutes` → 走权限校验，由 `access.ts` 的 `generateAccess` 按角色生成。
- 需要免 Layout 的外链页可开启 `externalRoutes`（`routes/external/`，默认注释）。

## 相关规范

- 权限拦截 / 动态路由生成 / meta 权限字段 → `11-access-control.md`
- i18n key 组织 → 见 `07-ui-layout.md` 的 i18n 小节
