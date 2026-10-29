# 03 — 菜单驱动的应用外壳与 RBAC

**What to build:** 登录后，侧边栏、面包屑与页面标题来自后端菜单树；四类角色看到不同的导航与操作；直接访问越权 URL 被拒绝；按钮按权限码隐藏或禁用；菜单接口失败时可重试。

**Blocked by:** 02 — 登录、会话与 401；外部 P0：后端提供“当前用户菜单”接口或放宽 `/menus/tree` 的 `system:menu:list`；同时修复 `content_viewer` 种子（222/231/233 不存在、缺 `content:content:query`）。

**Status:** done

> 菜单数据当前由前端模拟 provider 生成（`src/lib/navigation/menu-provider.ts`），等后端提供“我的菜单”接口后替换；`content_viewer` 的权限已在模拟数据中修正。内容详情页与按钮级权限的具体使用留给 ticket 04/08/09。

- [x] 登录后获取当前用户菜单树并渲染导航、面包屑与页面标题。
- [x] 菜单路径映射到应用页面；未匹配路由显示应用内降级页（真实菜单接入时补充错误上报）。
- [x] 菜单接口失败显示可重试的错误态。
- [x] `content_ops`、`system_admin`、`content_viewer`、`super_admin` 的导航差异符合预期。
- [x] 直接访问越权路由显示 403 或重定向到安全页面。
- [x] 页面按权限码控制；按钮级使用同一 `hasPermission` 口径，具体按钮在后续 ticket 接入。
- [x] 菜单变更在刷新或重新登录后生效（当前由角色权限驱动）。
- [ ] `content_viewer` 修复种子后可以只读打开内容详情（ticket 09）。
- [x] E2E 覆盖四角色导航差异与越权拦截。
