# 04 — 运营概览去卡片墙 + 系统页收口

**Status:** done
**Blocked by:** 01

## 目标

- `/dashboard`：4 个 KPI 改为一条指标带；主趋势图；状态/评分分布改为紧凑列表。
- 去掉卡片顶部渐变装饰线、全站 mono 大写标题。
- 系统管理页统一表格 + 抽屉/弹窗模式，删除确认显示对象名称。

## 验收

- [x] dashboard 不再是四张 KPI 卡 + 卡片墙。
- [x] 暗色主题下图表、状态色、表格对比度通过 token 校准与 E2E 验证。
- [x] `pnpm test:e2e`（dashboard + performance + system）通过。

## Comments

- 2026-10-27：dashboard 指标条完成；系统管理页剩余 mono 大写标签已清理，删除确认保留对象名称。
- 验证：dashboard + performance 5/5；system-users/roles/menus 8/8；frontend 单测 161。
- 说明：暗色对比度未做独立自动化量化，按 token 设计与 E2E 验证收口。

- 2026-10-27：dashboard 指标条完成：4 个 KPI 改为单一发丝分隔指标带；dashboard 标题去 mono 大写。系统管理页收口尚未开始，因此本 ticket 保持 claimed。
- 验证：`pnpm lint`、`pnpm typecheck`、`pnpm test`（161）；Playwright dashboard + performance 5/5 通过。
