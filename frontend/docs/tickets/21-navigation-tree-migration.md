# 21 — 导航迁移：后端导航树驱动应用外壳

**What to build:** 登录后，侧边栏、面包屑、页面标题与路由守卫全部由 `GET /api/v1/menus/tree` 驱动；删除前端静态导航；菜单接口失败时 fail-closed；后端配置了但前端未实现的页面显示降级页并上报。

**Blocked by:** 20 — 后端导航树前置改动（仅「切换真实接口 / 删除静态实现」依赖；实现与 stub 验收可先行）

**Status:** todo

> 决策依据：[ADR 0006](../adr/0006-navigation-tree-driven-shell.md)。过渡机制：`NAV_SOURCE=static|backend`（默认 `static`）。backend 模式走新 provider 与守卫；ticket 20 完成后把默认改为 `backend`，并删除静态实现与开关。

## Checklist

- [x] `src/lib/api/endpoints.ts` 新增 `getNavTree(accessToken)`（契约 `GET /api/v1/menus/tree`），RSC 经 typed client 直连后端；不新增 BFF 白名单，不使用跨请求缓存。
- [x] `src/lib/navigation/menu-provider.ts` 在 `NAV_SOURCE=backend` 时消费导航树；静态 `NAVIGATION` 在过渡期保留。
- [x] 映射：`type=0` 渲染为分组、`type=1` 渲染为链接；防御性过滤 `visible=false`、忽略 `type=2`、按 `order_no` 升序；目录剔除空子节点。为保证双源过渡，统一收敛为现有 `MenuNode` 视图模型（`id: string`），而不是直接暴露生成的 `MenuTreeNode`。
- [x] 文案：以 `path` 映射到 `Sidebar.*` message key，未命中回退后端 `name` 并通过 Sentry 上报；面包屑与页面标题复用同一 label。
- [x] 守卫：`NAV_SOURCE=backend` 时 `requireAccess` 基于导航树路径集合；取树失败时页面抛错到错误边界（fail-closed），布局失败显示可重试错误壳；401 交给现有会话刷新流程。
- [x] 未实现页面：`(app)/not-found.tsx` 渲染降级页，并由 `NotFoundReporter` 上报一次路径。
- [x] 菜单 CRUD 成功后调用 `router.refresh()`，导航即时反映变更。
- [ ] 测试：树转换、label 回退、排序过滤、守卫路径集合、`/menus/tree` 消费已覆盖（单测 + MSW）；E2E 四角色 backend 模式待补（stub 需按角色过滤导航树）。
- [ ] 收口：ticket 20 完成后把 `NAV_SOURCE` 默认改为 `backend`、删除静态 `NAVIGATION`/`canAccessPath` 与开关；更新 ticket 03/13 的备注与 `docs/acceptance.md`。

## Comments

- 2026-10-27：按 `NAV_SOURCE` 过渡实现完成（默认 `static`，应用行为不变）。新增 `menu-mapping.ts`（纯映射）、`labels.ts`、`backend-nav.ts`（RSC 取数 + `cache()` 去重 + 缺 label 上报）、`config.ts`；守卫与导航 provider 均接入开关；菜单 CRUD 后 `router.refresh()`；`(app)/not-found.tsx` 增加路径上报；图标补充 `setting` / `file-text` 别名。
- 验证：`pnpm typecheck`、`pnpm lint`、`pnpm test`（161）、`pnpm test:e2e`（50，默认 `static`）全绿；`backend-nav.test.ts` 断言 `NAV_SOURCE=backend` 时确实请求 `/api/v1/menus/tree` 并携带 Bearer token。
- 未切换默认导航的原因：真实后端 `/menus/tree` 对非管理员仍 403，且未按用户过滤（见 ticket 20 实测）。
