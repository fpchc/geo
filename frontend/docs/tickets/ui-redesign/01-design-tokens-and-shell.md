# 01 — Editorial Precision v2：tokens + App Shell + 基础组件

**Status:** done
**Blocked by:** —

## 目标

把全站视觉基座从「蓝色 + mono 大写 + 卡片墙」升级为 Editorial Precision v2，同时保留现有 shadcn/Radix 组件层、亮/暗双主题和导航树架构。

## 范围

- `src/app/globals.css`：重写亮/暗 token；暖中性画布 + 信号青柠主色；保留 `--chart-1..5`、`--success`、`--warning`、`--destructive`、`--overlay`。
- `src/components/ui/button.tsx`：主按钮改为墨色底；focus ring 使用 `--ring`。
- `src/components/ui/card.tsx`：`CardTitle` 默认改为 sans 14px/500，不再默认 mono 大写。
- `src/components/ui/badge.tsx`：改为圆角胶囊；默认不再用青柠作文字色。
- `src/components/ui/label.tsx`：改为 sans 12px/500。
- `src/components/ui/table.tsx`：表头改为 sans 12px/500；行 hover 使用 `--muted`。
- `src/components/ui/empty-state.tsx`：去掉 mono 破折号，改为青柠圆点。
- `src/components/app-shell/app-shell.tsx`：侧栏 232px、顶栏 52px；移除 `MVP · v0.1` 占位；顶栏去 backdrop blur。
- `src/components/app-shell/sidebar-nav.tsx`：分组标题去 mono 大写；active 使用青柠指示条 + 中性底。
- `src/components/page-shell.tsx`：eyebrow 去 mono 大写。
- `src/components/brand-mark.tsx`：图标使用 `--primary-strong`；tagline 去 mono 大写。

## 验收

- [x] 亮色 token 为暖中性 + 墨色 + 信号青柠；暗色 token 完整可用。
- [x] 全站主按钮为墨色底，不再出现青柠底白字。
- [x] 卡片标题、表单 label、表头默认不再使用 mono 大写。
- [x] 侧栏 232px、顶栏 52px；不再显示 `MVP · v0.1`。
- [x] 现有 `pnpm lint`、`pnpm typecheck`、`pnpm test` 通过。
- [x] 不新增依赖，不引入第二套组件库。

## Comments

- 2026-10-27：claimed。设计依据：`backend/docs/specs/ui-redesign.md`。
- 2026-10-27：done。已完成 tokens、App Shell、基础组件与状态胶囊改造。
- 验证：`pnpm lint`、`pnpm typecheck`、`pnpm test`（40 files / 161 tests）、`pnpm build`、`pnpm check:messages`、`pnpm check:client-secrets` 全绿。
