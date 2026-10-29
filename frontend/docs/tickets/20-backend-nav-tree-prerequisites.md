# 20 — 后端导航树前置改动

**What to build:** 让 `GET /api/v1/menus/tree` 成为当前用户可用的导航树：登录即可读、按用户角色菜单过滤、路径与前端路由一致，并补齐工作台节点与损坏的种子数据。

**Owner:** backend（本文件是 frontend 侧的工单描述；实际改动在 `../backend`，需由 backend 会话执行）

**Blocked by:** —

**Status:** todo

> 依据 2026-10-27 的只读核对：`backend/app/api/identity/menu.py`、`backend/app/services/menu_service.py`、`backend/scripts/menu_seed.py`、`backend/scripts/user_seed.py`。以下改动均未执行。
>
> 背景决策见 [ADR 0006](../adr/0006-navigation-tree-driven-shell.md)；前端迁移见 [ticket 21](./21-navigation-tree-migration.md)。

## 现状缺口

- `/menus/tree` 仍挂 `require_permission("system:menu:list")`，`content_ops` / `content_viewer` 调用会 403。
- `MenuService.nav_tree()` 返回全部菜单（仅剔除按钮），不按当前用户过滤。
- 种子路径与前端路由不一致：`/system/user`、`/system/role`、`/system/menu`、`/content/manage`、`/content/setting`。
- 种子没有 `/dashboard` 节点，而前端登录后默认跳转 `/dashboard`。
- `content_viewer` 的 `menu_ids` 引用了不存在的 222/231/233，且缺少内容详情所需的 `content:content:query`。

## Checklist

- [ ] `GET /api/v1/menus/tree` 的鉴权从 `system:menu:list` 改为「仅需登录」；`GET /api/v1/menus/tree/all` 保持 `system:menu:list`。
- [ ] `nav_tree()` 接收当前用户上下文，按用户角色关联的 menu_ids 过滤后再建树；父目录若无可见子节点则剔除；仍剔除按钮节点。
- [ ] 菜单种子 path 对齐前端真实路由：`/system/user` → `/system/users`、`/system/role` → `/system/roles`、`/system/menu` → `/system/menus`、`/content/manage` → `/content/library`、`/content/setting` → `/content/settings`；`/content/studio` 不变。
- [ ] 新增顶级 MENU 节点「工作台」，path `/dashboard`，并授权给四个内置角色（super_admin / system_admin / content_ops / content_viewer）。
- [ ] 重建 `content_viewer` 的 menu_ids：保留 `2`（内容生产目录）、`12`（内容库）与现有只读按钮 `210`（内容查询）、`212`（评分查询）；移除不存在的 `222/231/233`；不授予 `content:content:list` 之外的写权限。
- [ ] 通过 `scripts/gen_menu_sql.py` 重新生成 `deploy/sql/menu.sql` 与对应 Alembic data migration，保证幂等可重放。
- [ ] 同步更新 backend 的 `docs/constraints/menu-seed.md` 与相关测试。
- [ ] OpenAPI 响应结构不变；若 summary/description 需要反映「当前用户」语义，更新后通知前端重跑 `pnpm openapi:generate`。

## Acceptance

- 四个内置角色登录后调用 `/menus/tree` 均返回 200，且只包含各自授权的目录/菜单，不含按钮与越权节点。
- `content_ops` / `content_viewer` 不再 403；`/menus/tree/all` 对两者仍为 403。
- 树中所有 `path` 都能在前端找到对应页面；`/dashboard` 对四个角色均可见。
- `content_viewer` 能只读打开内容详情（具备 `content:content:query`）。

## Comments

- 2026-10-27 实测（本机 7001，种子账号）：
  - `admin`（super_admin）：`/menus/tree` 200、0 个按钮、6 个菜单；`/menus/tree/all` 200、25 个按钮。
  - `sysadmin`、`content_lead`：两个接口均 **403**，`缺少权限：system:menu:list`。
  - `nav_tree()` 当前只 prune 按钮、不按用户过滤；admin 能拿到全部菜单。
  - 目标语义已确认：`/menus/tree` 只返回当前用户可见菜单（剔按钮），`/menus/tree/all` 返回全量（含按钮），两者结构一致。
  - 因此「放宽权限」与「按用户过滤」必须同批完成；只放宽会让内容角色看到系统管理菜单。
