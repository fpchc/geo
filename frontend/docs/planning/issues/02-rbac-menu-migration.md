# 02 · 确定后端菜单驱动的 RBAC 迁移方案

Type: grilling
Status: open
Blocked by: —

## Question

如何从当前 `accessMode=frontend` 迁移到 `accessMode=backend`，并让菜单、路由、按钮权限三层一致？

需要明确：

- 后端菜单树字段与前端路由/组件的映射规则；`/menus/tree` 与 `generateAccessible('backend')` 的契约。
- `component` 字段如何映射到 `apps/web-admin/src/views/**`；找不到组件时的降级策略。
- system 路由的 `meta.authority` 如何声明；按钮 `v-access` 的权限码来源与命名。
- `super_admin` 与 `system_admin / content_ops / content_viewer` 四类角色的可见菜单与按钮差异。
- 后端菜单种子与前端路由不一致时，以哪边为准、如何检测。
- KeepAlive 对路由 `name` 的要求，以及三级以上路由拍平后的菜单映射。

输出：迁移步骤、路由/菜单映射表、权限码清单、验收场景；标注需要后端配合的字段。
