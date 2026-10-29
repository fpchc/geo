# 采用 Direction C（Indigo Studio）作为运营后台视觉语言

> Status: accepted（2026-10-29）
> Supersedes: [ADR-0005](0005-precision-instrument-visual-language.md)

## Context

ADR-0005 将界面定为 **Editorial Precision v2**：暖中性画布、信号青柠主色、墨色主按钮、边框优先、只动 opacity/transform，并明确禁止渐变、玻璃拟态与大圆角。该方向已完成 tokens、Shell 与三栏工作台改造。

在 `docs/preview/ui-direction-c.html` 的完整原型评审后，团队确认改为 **Direction C（Indigo Studio）**：冷灰画布、靛蓝主色、渐变主按钮、玻璃侧栏/顶栏、柔和卡片阴影，以及 CSS + Motion + GSAP 分层编排动效。原型已逐屏覆盖登录、运营概览、内容创作、内容库、内容配置、用户、角色、菜单与抽屉/弹窗/Toast。

这是视觉方向的反转，不是增量调整。旧 ADR 中「禁止渐变/玻璃/大圆角」「禁止页面切换与视差」「只动 opacity/transform」等约束随之失效。

## Decision

- 视觉以 `docs/preview/ui-direction-c.html` 为唯一权威；工程规范见 `docs/specs/ui-redesign.md`。
- 亮色 token：`--background #F3F4F7`、`--foreground #12141A`、`--primary #4F46E5`、`--primary-strong #3730A3`；暗色：`#0E1015` / `#EEF0F5` / `#818CF8`。
- 允许并使用：径向渐变背景、渐变主按钮与 Logo、玻璃侧栏/顶栏、14–18px 圆角、多层阴影与彩色光晕。
- 动效分层：CSS transition/keyframes 打底 → Motion 做弹簧交互 → GSAP 做页面切换、评分环、趋势图、ScrollTrigger 视差与登录时间线。
- 新增运行时依赖 `gsap`、`gsap/ScrollTrigger`、`motion`；动画库懒加载，并同步调整 bundle 预算。
- 保留的功能架构不变：Next.js 16 App Router、RSC 首屏、typed client、后端导航树、RBAC、i18n、上传校验。
- 默认落地页仍为 `/content/studio`；`/dashboard` 保留为运营概览。
- 无障碍不降级：所有动效支持 `prefers-reduced-motion`，核心文字对比度 ≥ 4.5:1，焦点环与键盘关闭保留。
- 原型中无后端能力的元素（通知、全局搜索、登录卖点、迷你折线）保留视觉槽位；不伪造业务数据。

## Considered Options

- **维持 Editorial Precision v2**：实现成本最低，但与团队确认的 Direction C 原型不一致，且无法承载原型中的编排动效。
- **只取部分 Direction C 元素**：避免新增依赖，但会造成「半套 C」的拼凑感，违背「完全照原型」的决策。
- **完整采用 Direction C（选中）**：视觉与动效一致，代价是新增 3 个依赖、重做已完成的 v2 页面，并放宽旧 ADR 的禁令。

## Consequences

- ADR-0005 标记为 superseded；其禁止项不再约束实现。
- `docs/specs/ui-redesign.md` 重写为 Direction C；`docs/tickets/ui-redesign/` 的 v2 tickets 标记为 superseded，改由 `docs/tickets/ui-direction-c/` 承接。
- `src/app/globals.css` 需整体重写 token、渐变、玻璃层与关键帧；Shell、基础组件与全部页面按原型重做。
- 新增依赖与动效会提高客户端体积；必须懒加载、按页面拆分，并校准 `scripts/check-bundle-budget.mjs`。
- 后端契约、权限、菜单与业务状态机不变；若后端文档中仍有 v2 视觉描述，由 backend 会话在其边界内同步。
