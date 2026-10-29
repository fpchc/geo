# 导航由后端导航树驱动，文案由前端 i18n 映射

契约已把菜单结构拆成 `GET /menus/tree`（导航树，剔除按钮）与 `GET /menus/tree/all`（授权树，全量含按钮）。我们决定让 `(app)` 布局在 RSC 中直接取导航树（不经 BFF、不做跨请求缓存），由它驱动侧边栏、面包屑、页面标题与 `requireAccess` 守卫；页面权限不再有第二份前端清单。后端节点的 `name` 是单语字符串，而项目要求业务文案中英双语，因此文案以 `path` 映射到前端 message key，未命中时回退后端 `name` 并上报；按钮权限继续取自 `GET /auth/me`。导航接口失败或返回 403 时 fail-closed：渲染错误壳并允许重试，不回退静态导航。管理员修改菜单后调用 `router.refresh()`；后端配置了但前端未实现的页面进入应用内降级页并上报。

## Status

accepted，但落地被后端前置改动阻塞。2026-10-27 对本机 7001 实测：`admin` 调 `/menus/tree` 返回 200（0 按钮、6 菜单）、`/menus/tree/all` 返回 200（25 按钮）；`sysadmin` 与 `content_lead` 对两者均返回 **403**。`nav_tree()` 只剔除按钮、不按当前用户过滤。种子路径与前端路由不一致（`/system/user` vs `/system/users` 等），且缺少 `/dashboard`。前置清单见 [ticket 20](../tickets/20-backend-nav-tree-prerequisites.md)；前端迁移见 [ticket 21](../tickets/21-navigation-tree-migration.md)。

## Considered Options

- **后端返回双语名称**：数据最干净，但需要改契约与后端种子，且不能解决已有调用方对单语 `name` 的假设。
- **直接显示后端 `name`**：零映射成本，但违反项目「业务文案 100% 中英」硬规则。
- **前端静态导航兜底**：可用性最好，但会重新引入第二份权限清单，正是本次迁移要消除的漂移源。
- **前端维护 path 别名或按 `/auth/me` 二次过滤**：能绕开后端改动，但会引入第二份路由/权限映射，同样是要消除的漂移源。

## Consequences

- `/menus/tree` 成为所有已登录页面的硬依赖：必须登录可读、按用户过滤；`/menus/tree/all` 保持仅管理员可用。
- 路径是后端菜单与前端路由的接缝：后端种子必须使用前端真实路由（`/system/users`、`/content/library` 等），前端不维护别名表。
- `/dashboard` 必须是所有角色可见的菜单节点，它是登录后的默认落点。
- 后端新增菜单在前端补 message key 之前只显示单语；漏配通过上报暴露，而不是静默。
- 页面首屏多一次导航树请求；守卫与布局在同一次 RSC 请求内通过 React `cache()` 去重，不使用跨请求缓存。
- 静态 `NAVIGATION` 与 `canAccessPath` 在切换后删除；角色树夹具只存在于测试代码中。
