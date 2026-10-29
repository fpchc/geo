# 05 — UI 所需的后端最小配合

**Status:** done
**Owner:** backend
**Blocked by:** —

## 范围

- `ContentOut` 增加 `title / created_at / updated_at / username`；`ContentQuery` 增加 `keyword`。
- `/menus/tree` 登录可读、按用户过滤；菜单 path 对齐前端路由；新增 `/dashboard` 节点。
- 补齐 `/api/v1/dashboard/overview` 与 `/api/v1/dashboard/trends`。

## 验收

- [x] 内容库能拿到标题与时间。
- [x] 四个内置角色都能拿到自己的导航树。
- [x] dashboard 在真实后端就绪后不再显示「未就绪」。

## Comments

- 2026-10-27：完成 `ContentOut` 只读字段与 `ContentQuery.keyword`；内容列表按当前版本标题筛选，版本标题与用户名各一次批量查询，避免 N+1。
- 2026-10-27：完成 `/menus/tree` 登录可读 + 按角色过滤 + 祖先目录补齐；菜单种子路径对齐前端，新增 `/dashboard`，修复 `content_viewer` 菜单绑定。
- 2026-10-27：已重新生成 `deploy/sql/menu.sql`（34 行）与 `deploy/sql/user.sql`；目标库需由用户幂等导入。
- 2026-10-27：已更新 `../frontend/openapi.json` 并重新生成 typed client。`openapi:check` 的 diff 是本次契约变更的预期结果，提交后通过。
- 验证：backend `ruff check`、`mypy app`、`pytest`（48 passed / 10 skipped）；frontend `lint`、`typecheck`、`test`（161 passed）。
- 2026-10-27：完成 `/api/v1/dashboard/overview` 与 `/trends`；新增 `content:dashboard:read`（菜单按钮 800），四个内置角色均授权。

- 依赖 frontend ticket 20 的核对结论；实现须在 backend 工作根执行。
