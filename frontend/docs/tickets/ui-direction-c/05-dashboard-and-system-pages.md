# 05 — 运营概览 + 系统管理页

**Status:** done
**Blocked by:** 01, 02

## 目标

- `/dashboard` 从 v2 的指标条改为原型的 hero 渐变卡 + KPI 卡片 + 状态构成 + 最近内容，并接入图表与滚动编排。
- `/system/users`、`/system/roles`、`/system/menus` 对齐原型的卡片/面板/表格/弹窗形态。

## 范围

### 运营概览

- 页头 + 14/30/90 天分段控件（02 原语）。
- Hero 卡：渐变底、光斑、点阵网格、34px 数值、涨跌胶囊、SVG 趋势图。
- 趋势图：GSAP 描线、面积淡入、数据点回弹、末端脉冲；数据来自现有 dashboard trends 接口。
- KPI 2×2：真实指标 + 涨跌 + 迷你折线；无序列时显示中性占位，不编造数值。
- 状态构成：堆叠条 + 状态进度 + 提示 + 留存率。
- 最近内容：5 行列表，点击可进详情/内容库。
- ScrollTrigger 编排仅作用于 hero 光斑与网格；离开路由时销毁。
- 保留未就绪、空态、错误内联态；dashboard 仍不作为默认落地页。

### 系统管理

- `users-page.tsx`：页头 + 新建用户；筛选面板；表格（迷你头像、姓名/用户名、角色、状态、最后登录、操作）；弹窗形态对齐原型。
- `roles-page.tsx`：角色列表 + 权限分组两列；保存授权。
- `menus-page.tsx`：导航树表格、分组行折叠、路径等宽、图标 chip；新建/编辑弹窗。
- 删除确认显示对象名称；不改变权限码与接口调用。

## 非范围

- 不新增 dashboard 指标或图表类型。
- 不改后端接口；dashboard 未就绪时保持未就绪态。

## 验收

- [ ] dashboard 与原型逐屏一致：hero、KPI、状态、最近内容。
- [ ] 趋势图动画与滚动视差在 reduced-motion 下降级；路由切换不残留 ScrollTrigger。
- [ ] 系统三页与原型一致，真实数据与权限行为不变。
- [ ] Playwright `dashboard + performance + system-*` 通过。
- [ ] `pnpm lint`、`pnpm typecheck`、`pnpm test` 通过。

## Comments

- 2026-10-29：创建。取代 ui-redesign/04。
- 2026-10-29：done。dashboard 改为 hero 渐变卡 + 2×2 KPI + 状态构成 + 最近内容；新增 `dashboard-hero`、`recent-content`、`lib/dashboard/metrics`，趋势图改为 GSAP 描线 SVG，ScrollTrigger 仅绑定 hero 光斑/网格并通过 `gsap.context().revert()` 清理；KPI 涨跌与迷你折线由 trends 序列计算，无序列显示中性占位。
- 系统页：用户页改为筛选面板 + 头像/姓名/角色/状态/最后登录表格；角色页改为 230px 角色列表 + 权限分组两列 + 顶部保存授权；菜单页改为可折叠导航树表格、等宽路径与图标 chip。权限码、typed client、RBAC 与删除对象名确认保持不变。
- 验证：`pnpm lint`、`pnpm typecheck`、`pnpm test`（46 files / 189 tests）、`pnpm check:messages`（490 keys）、`pnpm check:bundle`（259.7 KiB / 600 KiB）；Playwright `dashboard + performance + system-*` 14/14 通过。
