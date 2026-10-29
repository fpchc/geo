# 02 — 动效基座：GSAP / Motion / Toast / Drawer / Segmented

**Status:** done
**Blocked by:** 01

## 目标

按 spec 第 6 节建立三层动效基座（CSS → Motion → GSAP），让后续页面只消费统一封装，不各自 new 时间线、不重复绑定 ScrollTrigger。

## 范围

### 依赖与工程

- `pnpm add gsap motion`。
- 新增 `src/lib/motion/gsap-client.ts`：客户端动态 import GSAP/ScrollTrigger，注册插件，提供 `withGsap` 与清理约定。
- 新增 `src/hooks/use-reduced-motion.ts`：SSR 安全，监听 `matchMedia`。
- 新增 `src/components/motion/route-transition.tsx`：App Router 路由切换时 `opacity 0→1 / y 8→0`，350ms `power2.out`，结束后 `clearProps`；离开时 kill。
- 更新 `scripts/check-bundle-budget.mjs`：按 spec 记录新预算；动画库不得进入首屏 critical path。
- `next.config.ts` 如需 `transpilePackages` / 动态导入分包，一并处理。

### 动效原语

- `number-counter.tsx`：900ms 数字滚动，保留前缀/后缀/千分位/小数；无 Motion 时 rAF 降级；reduced-motion 直接终值。
- `segmented-control.tsx`：Motion 弹簧滑块（stiffness 420 / damping 34）；无 Motion 时直接定位。
- `toast.tsx` + `toast-provider`：底部居中黑色胶囊，spring 420/30 入场，2200ms 后退出；支持手动关闭与队列。
- `drawer.tsx`：右侧 500px，spring 300/32 入场、300ms 退出；遮罩 2px 模糊；Esc/遮罩关闭。
- `dialog.tsx`：460px、18px 圆角、spring 320/28。
- `score-ring.tsx`：104px conic ring，GSAP `--ring-p` 1150ms；reduced-motion 直接落值。
- `page-transition` 挂载在 `src/app/(app)/layout.tsx` 与登录页；确保 RSC 页面不被改成全客户端。

### 清理约定

- 路由变化、组件卸载时 `ctx.revert()` / `tl.kill()` / `ScrollTrigger.getAll().kill()` 仅限本组件实例。
- 禁止在多个页面重复注册插件；注册只发生一次。

## 验收

- [ ] 页面切换有统一 GSAP 过渡，且不残留时间线。
- [ ] 数字滚动、评分环、Toast、抽屉、弹窗、分段滑块均可复用。
- [ ] `prefers-reduced-motion` 下全部直接落到终态。
- [ ] 动画库为动态导入；首屏不加载 GSAP/Motion。
- [ ] `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm check:bundle` 通过。
- [ ] 更新后的 bundle 实际体积记录在 Comments。

## Comments

- 2026-10-29：创建。依赖选择依据 ADR-0007。
- 2026-10-29：done。新增 `gsap@3.15.0`、`motion@14.7.1`（均为动态 import，不进首屏）；实现 `useReducedMotion`、`loadGsap` / `loadGsapWithScrollTrigger`、`formatCount`、`NumberCounter`、`SegmentedControl`、`ToastProvider` / `useToast`、`Drawer`、`ScoreRing`、`RouteTransition`。
- 集成：`ToastProvider` 挂到根 layout；`RouteTransition` 包住 App Shell 主内容；搜索、通知、个人资料、账号设置四个占位入口改为 Toast 反馈。
- 取舍：`Dialog` 继续使用已有的 CSS `data-state` 动画（spring 曲线、240ms 入场），未改成 Motion 命令式动画；Radix 关闭即卸载，做退出动画需要 `forceMount` + 受控状态，留给 05 系统页收口时评估。`Drawer` 首次客户端渲染后常驻 portal，关闭时用 `inert` / `aria-hidden` 隔离，避免 effect 内 setState 的 lint 问题。
- Bundle：`pnpm check:bundle` 实测 dashboard 首屏 254.7 KiB / 600 KiB，保持原预算未上调；GSAP / Motion 未进入首屏 chunk。
- 验证：`pnpm lint`、`pnpm typecheck`、`pnpm test`（41 files / 164 tests）、`pnpm build`、`pnpm check:bundle`；auth E2E 独立端口 8/8。
