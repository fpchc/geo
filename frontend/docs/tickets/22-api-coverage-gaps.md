# 22 — 接口覆盖补齐：就绪探针 / 用户详情 / 角色详情 / 菜单详情

**What to build:** 契约中尚未真正使用的接口全部接入：就绪探针改打 `/health/ready`；用户、角色、菜单编辑弹窗打开时刷新单条数据。

**Blocked by:** —（可与 21 并行）

**Status:** done

> 来源：2026-10-27 的契约覆盖审计。内容模块 14 个操作与系统管理其余操作已全部接上，只剩以下缺口。

## Checklist

- [x] `/api/health/ready` 改调后端 `GET /api/v1/health/ready`，按 `ReadinessOut.components` 返回 degraded/503；更新 `route.test.ts` 与部署探针说明。
- [x] `users-client` 新增 `getUser(id)`（`GET /api/v1/users/{user_id}`）；用户编辑弹窗打开时 refetch，失败回退列表行数据并提示。
- [x] `roles-client` 新增 `getRole(id)`（`GET /api/v1/roles/{role_id}`）；角色编辑弹窗打开时 refetch。
- [x] 菜单编辑弹窗打开时调用现有 `getMenu(id)`（`GET /api/v1/menus/{menu_id}`），消除当前 0 调用方。
- [x] 确认 BFF 白名单与 origin/401/404 行为覆盖上述 GET；若服务端组件可直接取数，优先 RSC。
- [x] 测试：client 单测 + 弹窗组件测试（MSW），覆盖详情成功、404 与失败回退。

## Comments

- 2026-10-27：完成。就绪探针改为调用后端 `/health/ready`，以 `ReadinessOut.status` 判定，透传 `components`；E2E stub 补齐该端点。
- 三个编辑弹窗在打开时分别调用 `GET /users/{id}`、`GET /roles/{id}`、`GET /menus/{id}`。实现中发现竞态：详情晚于用户输入返回会覆盖已填内容（E2E `system-menus` 曾复现）。最终方案是**详情落地前只渲染骨架、不渲染表单**，失败时回退列表行数据并提示（`detailLoadError`）。
- 验证：`pnpm lint`、`pnpm typecheck`、`pnpm test`（154）、`pnpm test:e2e` 全绿。注意本机已有服务占用 7002 时，E2E 需改用 `E2E_PORT`/`E2E_STUB_PORT` 指向空闲端口，否则 Playwright 会复用旧服务并连到真实后端。
