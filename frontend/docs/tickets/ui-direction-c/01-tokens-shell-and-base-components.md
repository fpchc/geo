# 01 — Direction C：tokens + App Shell + 基础组件

**Status:** done
**Blocked by:** —

## 目标

把全站视觉基座从 Editorial Precision v2（青柠 + 暖中性 + 边框优先）切换到 Direction C（靛蓝 + 冷灰 + 渐变/玻璃/柔和阴影），同时保留现有 shadcn/Radix 组件层、亮暗主题、导航树、RBAC 与 i18n。

## 范围

### `src/app/globals.css`

- 按 spec 第 2 节重写亮/暗 token：`--background`、`--card`、`--primary`、`--primary-strong`、`--accent-grad`、`--faint`、`--line`、`--muted-dot`、`--chart-line`、`--sidebar-w`。
- 补齐 `--shadow-xs` / `--shadow-card` / `--shadow-lift` / `--shadow-pop` 与 `--ease-swift` / `--ease-expo` / `--ease-spring`。
- `--radius: 0.875rem`；派生 `radius-lg/xl/2xl`。
- body 固定径向渐变；暗色单独取值；`body.auth` 去掉全局光斑。
- 焦点环改为 `2px --ring` + `2px offset`；滚动条、selection 按原型。
- 迁入 CSS 关键帧与工具类：`.enter`、`.swap`、`fadeUp`、`fadeIn`、`popIn`、`chipOut`、`draw`、`grow`、`drift`、`floatY`、`pulseDot`、`genSlide`、`pulseOpacity`、`stackIn`、`badgePop`、`shimmer`。
- `prefers-reduced-motion` 全局降级与最终状态。

### App Shell

- `sidebar-nav.tsx`：212px / 折叠 64px；分组标题 10px 大写；导航项 36px、17px 图标、active 靛蓝渐变 + 3px 指示条；hover 右移与图标放大。
- `app-shell.tsx`：顶栏 56px、玻璃层、滚动阴影；折叠按钮、面包屑、搜索入口、主题切换、通知铃铛、头像。
- 用户浮层：向上弹出、折叠态向右弹出；个人资料 / 账号设置 / 退出登录。
- 品牌区：34px 渐变 Logo + `GEO Studio` + 副标题。
- 保留导航树驱动、fail-closed 与 i18n 映射；不新增静态导航清单。

### 基础组件

- `button.tsx`：渐变主按钮、次按钮、ghost、危险；34px / 10px 圆角；hover 上移、active 缩放。
- `card.tsx`：`rounded-2xl`、1px 边框、`--shadow-card`、20px 内边距；标题 14px/500 sans。
- `badge.tsx`：green / indigo / amber / gray / rose 五套；暗色单独取值。
- `input.tsx`、`select.tsx`、`textarea.tsx`：34px / 9px 圆角；focus 靛蓝边框 + 4px 光晕。
- `table.tsx`：13px、表头 11px、行 hover 靛蓝 3.5%、首列指示条、数字右对齐。
- `label.tsx`、`skeleton.tsx`、`empty-state.tsx`、`dialog.tsx`：对齐原型形态与间距。
- 新增 `segmented-control.tsx` 的静态形态（动效在 02 接入）。
- 新增 `toast.tsx` 的静态形态（动效在 02 接入）。
- 新增 `drawer.tsx` 的静态形态（动效在 02 接入）。

## 非范围

- 不重写页面内容结构（03–05 负责）。
- 不接入 GSAP/Motion（02 负责）。
- 不改认证、权限、导航树、API。

## 验收

- [ ] 亮色 token 与原型一致：冷灰画布、靛蓝主色、渐变主按钮、玻璃侧栏/顶栏。
- [ ] 暗色 token 完整，卡片、表格、玻璃层、图表均可读。
- [ ] 侧栏 212/64px、顶栏 56px、内容区间距与原型一致。
- [ ] 基础组件不再出现青柠或 v2 的 4/8/12px 圆角语言。
- [ ] `pnpm lint`、`pnpm typecheck`、`pnpm test` 通过。
- [ ] 不新增依赖（依赖在 02 引入）。

## Comments

- 2026-10-29：创建。视觉主源 `docs/preview/ui-direction-c.html`，取代 ui-redesign/01。
- 2026-10-29：done。完成 Direction C tokens、body 渐变/滚动条/焦点、关键帧与 reduced-motion；App Shell 改为 212/64px 侧栏 + 56px 玻璃顶栏 + 折叠按钮 + 搜索/通知/主题/头像；用户菜单迁入侧栏底部（个人资料、账号设置、语言、退出登录）；基础组件（button/card/badge/input/select/textarea/label/table/dialog/skeleton/empty-state）切换到 9–18px 圆角、靛蓝渐变、柔和阴影。
- 设计取舍：原型中的 Toast / Drawer / Segmented 静态形态改由 02 连同动效一起实现，避免先写一套再改一套；搜索与通知当前以 `title="暂未接入"` 占位，02 接入 Toast 后改为可点击反馈。
- 行为修正：退出登录移入用户菜单后，`tests/e2e/auth.spec.ts` 先点击「用户菜单」再点击「退出登录」。
- 验证：`pnpm lint`、`pnpm typecheck`、`pnpm test`（40 files / 161 tests）、`pnpm build`、`pnpm check:messages`（419 keys）；auth E2E 在独立端口 8/8 通过（7002 端口的既有服务会导致 stub backend 失联，非本次改动）。
