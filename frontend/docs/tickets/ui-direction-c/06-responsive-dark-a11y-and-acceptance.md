# 06 — 响应式 / 暗色 / 无障碍 / 性能 / 验收

**Status:** done
**Blocked by:** 03, 04, 05

## 目标

收口 Direction C 的全站质量：三档响应式、亮暗主题、无障碍、动效降级、bundle 预算与完整验收。

## 范围

### 响应式

- 1440px：全部桌面布局与原型一致。
- 1024px：创作页降级、配置页隐藏右侧状态卡、侧栏可折叠。
- 390px：侧栏 64px、登录单列、表格横向滚动、内容只读可用。
- 检查所有页面无横向溢出；抽屉/弹窗在窄屏可用。

### 暗色

- 逐页对照原型 `.dark` 段：token、卡片阴影、玻璃层、表格 hover、渐变 hero、登录右侧渐变、图表线色。
- 校验关键文字对比度；`--faint` 只用于非关键元信息。
- 主题切换在登录页与 Shell 都可用，且刷新后保持。

### 无障碍

- 核心文字 ≥ 4.5:1；图标按钮有 `aria-label`；状态徽标带文字。
- 焦点环全站可见；抽屉/弹窗/用户浮层 Esc 与遮罩关闭。
- 装饰光斑/网格 `aria-hidden`。
- 键盘走通生成、评审、保存、删除确认等核心路径。

### 动效质量

- `prefers-reduced-motion` 下无动画、无模糊、终态正确。
- 路由切换无重复时间线；ScrollTrigger 无泄漏；内存/性能剖面无明显抖动。
- 动画只在 transform/opacity/stroke/background-position 或 `--ring-p` 上运行。

### 工程

- 更新 `scripts/check-bundle-budget.mjs` 并记录实际体积。
- 更新 `docs/acceptance.md` 的 UI 验收记录。
- 完整门槛：`pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e && pnpm check:messages && pnpm check:client-secrets && pnpm check:bundle`。

## 验收

- [ ] 1440 / 1024 / 390 三档逐页截图对照原型。
- [ ] 亮色 / 暗色逐页对照。
- [ ] reduced-motion 全站验收。
- [ ] 键盘与焦点验收。
- [ ] 全套门槛命令通过。
- [ ] `docs/acceptance.md` 记录 Direction C 验收结论。

## Comments

- 2026-10-29：创建。
- 2026-10-29：done。完成 1440/1024/390 × 亮暗逐页审计；390px 内容工作台/内容设置只读，弹窗与抽屉保持在视口内；无横向溢出。新增全站焦点回退、移动端只读守卫、对比度 token 调整、窄屏分段控件/筛选换行、菜单折叠与库 ID 链接点击目标修正。`tests/e2e/responsive-a11y.spec.ts` 覆盖主题持久化、Esc 关闭、键盘主链路、焦点环、390px 无溢出、移动只读、窄屏浮层与 reduced-motion。完整门槛：lint、typecheck、test（46/189）、build、test:e2e（61）、check:messages（492）、check:client-secrets、check:bundle（259.7 KiB / 320 KiB）全部通过；Direction C 验收记录已补入 `docs/acceptance.md`。
