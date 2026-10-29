# UI 重设计 Spec：Direction C（Indigo Studio）

> Status: accepted（2026-10-29）
> 视觉主源：`docs/preview/ui-direction-c.html`。布局、显示效果、动效以其为准；本文件负责把原型翻译成可实施、可验收的工程规范。
> 取代：Editorial Precision v2（见 `docs/adr/0005-precision-instrument-visual-language.md`）。
> 决策记录：`docs/adr/0007-ui-direction-c.md`。
> 范围：前端表现层。后端业务规则、权限码、导航树、i18n、typed client、RSC 首屏与数据行为不变。
> 默认落地：登录后进入 `/content/studio`；无内容权限时回退 `/dashboard`。

## 0. 决策与优先级

1. **视觉以原型为准。** 颜色、圆角、阴影、渐变、玻璃层、间距、字号、图标、布局、动效曲线与时长，全部以 `docs/preview/ui-direction-c.html` 为唯一权威。
2. **功能架构不变。** 保留 Next.js 16 App Router、RSC 首屏、`src/lib/api` typed client、后端导航树、RBAC、Zustand/TanStack Query、中英双语。
3. **真实数据优先。** 原型中的 mock 数值只用于确定版式；正式实现使用真实接口数据。没有数据支撑的视觉槽位按第 12 节处理，不编造业务数字。
4. **动效分层。** CSS transition/keyframes 打底 → Motion 做交互 → GSAP 做时间线与滚动。
5. **可访问性不降级。** 原型的所有动效都必须支持 `prefers-reduced-motion`；核心文字对比度、焦点环、键盘关闭不因视觉升级而退化。
6. **依赖受控。** 新增 GSAP、ScrollTrigger、Motion 三个运行时依赖，必须懒加载，并同步调整 bundle 预算。

冲突处理顺序：原型（视觉）> 本 spec > 其他文档。行为、安全、i18n、数据真实性以本 spec 与 `docs/constraints/README.md` 为准。

## 1. 目标与非目标

### 目标

- 建立一套高密度、长时间可用的现代内容运营工作台视觉。
- 用冷灰画布、靛蓝强调色、柔和卡片与编排动效替代此前的暖中性 + 青柠方向。
- 登录页、Shell、创作工作台、内容库、配置页、系统页、运营概览全部与原型逐屏对齐。
- 动效成为体验的一部分：入场、页面切换、数字滚动、评分环、图表描线、抽屉/弹窗弹簧、滚动编排。

### 非目标

- 不改后端接口、权限码、菜单种子与业务状态机。
- 不新增原型之外的页面或功能。
- 不做移动端编辑；移动端保持只读与可用。
- 不做主题编辑器；保留亮/暗双主题，跟随原型 token。
- 不引入第二套组件库；继续使用现有 shadcn/Radix 形态与 Lucide 图标。

## 2. Design Tokens

所有 token 写入 `src/app/globals.css`，组件只引用 token，不写死 hex。下表 hex 为原型参考值。

### 2.1 色彩（亮色）

| Token | 值 | 用途 |
| --- | --- | --- |
| `--background` | `#F3F4F7` | 页面底色 |
| `--foreground` | `#12141A` | 主文字 |
| `--card` | `#FFFFFF` | 卡片、面板、抽屉 |
| `--card-foreground` | `#12141A` | 卡片文字 |
| `--primary` | `#4F46E5` | 强调色、当前项、图表主线 |
| `--primary-foreground` | `#FFFFFF` | 强调色上的文字 |
| `--primary-strong` | `#3730A3` | 亮色下的强调文字与图标 |
| `--secondary` | `#EEF0F5` | 次级底色 |
| `--muted` | `#EEF0F4` | hover、次级区域 |
| `--muted-foreground` | `rgba(18,20,26,0.45)` | 次级文字 |
| `--accent` | `rgba(79,70,229,0.10)` | 选中底、浅强调 |
| `--accent-foreground` | `#3730A3` | 浅强调上的文字 |
| `--destructive` | `#E11D48` | 错误、删除 |
| `--destructive-foreground` | `#FFFFFF` | 错误底上的文字 |
| `--success` | `#059669` | 成功、已留存 |
| `--warning` | `#B45309` | 待评审、警示 |
| `--border` | `rgba(18,20,26,0.07)` | 分隔线、卡片边框 |
| `--input` | `rgba(18,20,26,0.10)` | 输入框边框 |
| `--ring` | `rgba(79,70,229,0.55)` | 焦点环 |
| `--overlay` | `rgba(18,20,26,0.32)` | 遮罩 |
| `--faint` | `rgba(18,20,26,0.32)` | 弱化元信息、占位符 |
| `--line` | `rgba(18,20,26,0.06)` | 发丝线 |
| `--muted-dot` | `rgba(18,20,26,0.20)` | 图表中性点 |
| `--chart-1..5` | `#4F46E5` `#10B981` `#FBBF24` `#FB7185` `#8B5CF6` | 图表专用 |
| `--chart-line` | `#4F46E5` | 趋势主线 |
| `--accent-grad` | `linear-gradient(135deg,#6366F1 0%,#4F46E5 55%,#7C3AED 100%)` | 主按钮、Logo、头像、强调条 |

### 2.2 色彩（暗色）

| Token | 值 |
| --- | --- |
| `--background` | `#0E1015` |
| `--foreground` | `#EEF0F5` |
| `--card` | `#171A22` |
| `--primary` | `#818CF8` |
| `--primary-foreground` | `#FFFFFF` |
| `--primary-strong` | `#A5B4FC` |
| `--secondary` / `--muted` | `#232733` |
| `--muted-foreground` | `rgba(238,240,245,0.50)` |
| `--accent` | `rgba(129,140,248,0.16)` |
| `--accent-foreground` | `#C7D2FE` |
| `--destructive` | `#FB7185` |
| `--success` | `#34D399` |
| `--warning` | `#FBBF24` |
| `--border` | `rgba(238,240,245,0.08)` |
| `--input` | `rgba(238,240,245,0.14)` |
| `--ring` | `rgba(129,140,248,0.60)` |
| `--overlay` | `rgba(0,0,0,0.55)` |
| `--faint` | `rgba(238,240,245,0.38)` |
| `--chart-1..5` | `#818CF8` `#34D399` `#FBBF24` `#FB7185` `#A78BFA` |
| `--chart-line` | `#818CF8` |

暗色不是反相：卡片阴影、hero 渐变、玻璃层、表格 hover 都必须单独取值，见原型 `.dark` 段。

### 2.3 全局背景与玻璃层

- `body`：`--background` + 两处固定 `radial-gradient`（左上靛蓝 10%、右上紫 7%），`background-attachment: fixed`。
- 暗色 body 使用 18% / 12% 的靛蓝与紫光斑。
- `.sidebar`：`rgba(255,255,255,0.84)` + `backdrop-blur(18px)`；暗色 `rgba(17,20,27,0.82)`。
- `.topbar`：`rgba(255,255,255,0.75)` + `backdrop-blur(12px)`；滚动后 `0.92` + 阴影；暗色对应替换。
- 登录页 `body.auth` 去掉全局光斑；左侧使用独立深色渐变与网格纹理。

### 2.4 字体

| 用途 | 字体栈 | 规格 |
| --- | --- | --- |
| UI / 正文 | `Inter`, `PingFang SC`, `Hiragino Sans GB`, `Microsoft YaHei`, sans-serif | 14px / 1.5 |
| 数据 / ID / 路径 | `JetBrains Mono`, `Cascadia Code`, `SFMono-Regular`, monospace | 12px |
| 页面标题 | 同 UI | 21px / 600 / tracking -0.02em |
| Hero 数值 | 同 UI | 34px / 600 / tracking -0.03em |
| 卡片标题 | 同 UI | 14px / 500 |
| 分区小标题 | 同 UI | 10px / 500 / uppercase / tracking 0.08em |
| 导航分组 | 同 UI | 10px / uppercase / tracking 0.14em |
| 表格 | 同 UI | 13px |
| 表头 | 同 UI | 11px / 500 / tracking 0.03em |
| 提示 / 元信息 | 同 UI | 11px |
| Markdown 正文 | 同 UI（原型的 prose 为无衬线） | 14.5px / 1.9 |

- `--text-2xs: 0.625rem`，行高 `0.875rem`，字距 `0.02em`。
- 原型的正文不使用衬线字体；此前 `--font-serif` 的阅读字体要求作废，可保留变量但不用于内容区。
- 数字列使用 `font-variant-numeric: tabular-nums`。
- 字重只用 400 / 500 / 600。

### 2.5 圆角、阴影、间距

| 项 | 值 |
| --- | --- |
| 基础圆角 | `--radius: 0.875rem`（14px） |
| 输入 / 下拉 / 文本域 | 9px |
| 按钮 / 图标按钮 | 10px / 9px |
| 分段控件 | 12px 外框，8px 内部按钮 |
| 卡片 / 面板 | 14–16px（`rounded-2xl`） |
| 弹窗 | 18px |
| 胶囊 / 徽标 / Toast | 全圆角 |
| 阴影 | `--shadow-xs`、`--shadow-card`、`--shadow-lift`、`--shadow-pop`（见原型 `@theme`） |
| 间距 | 4px 网格；卡片内边距 16–20px；页面内容 `px-5 pt-5 pb-24` |

- 阴影与边框并用：卡片默认 `1px --border` + `--shadow-card`；hover 抬升使用 `--shadow-lift`；浮层使用 `--shadow-pop`。
- 允许彩色光晕（主按钮、Logo、KPI 角标、评分环），但仅用于强调元素。

### 2.6 曲线

| Token | 值 | 用途 |
| --- | --- | --- |
| `--ease-swift` | `cubic-bezier(0.22, 0.61, 0.36, 1)` | 常规过渡 |
| `--ease-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | 大位移入场 |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 按钮、图标、缩略图回弹 |

### 2.7 图标

- 继续使用 Lucide；原型内联 SVG 的线宽为 `1.7`，尺寸 14 / 16 / 17 / 18px。
- 导航 17px、按钮 14px、工具栏 16px、空态 18px。
- 后端菜单 `icon` 字段映射到 Lucide 名称的规则不变。
- 禁止 emoji 当图标，禁止混用第二套图标库。

## 3. App Shell

| 区域 | 规格 |
| --- | --- |
| 侧栏 | 212px；折叠 64px；`position: sticky; height: 100dvh` |
| 顶栏 | 56px；sticky；玻璃层 |
| 内容区 | `px-5 pt-5 pb-24`；≤900px 时 `px-3.5 pt-4 pb-20` |
| 侧栏折叠 | `body.collapsed`；宽度过渡 180ms |
| 移动端 | ≤640px 自动折叠为 64px 图标栏 |

### 3.1 侧栏

- 顶部品牌：34px 渐变 Logo（字母 G）+ `GEO Studio` + 副标题「内容运营工作台」。
- 分组标题：`内容生产`、`系统管理`，10px 大写、`--faint`、字距 0.14em。
- 导航项：36px 高、13px、10px 圆角、图标 17px。
- hover：底色 `rgba(18,20,26,0.04)`、右移 2px、图标放大 1.08。
- active：靛蓝渐变底 + 左侧 3px 指示条（高 18px，`--primary`）+ `--primary` 文字。
- 底部：用户卡片（头像、姓名、角色、chevron），点击弹出向上浮层；折叠态浮层向右弹出。
- 用户浮层：个人资料、账号设置、退出登录；退出为危险色。
- 折叠按钮位于顶栏左侧，不与品牌重复。
- 导航仍由后端导航树驱动；文案通过 path 映射 i18n；接口失败 fail-closed。

### 3.2 顶栏

- 左侧：折叠按钮 + 面包屑（分组 / 当前页）。
- 右侧：全局搜索入口（搜索图标 + 「搜索内容」+ `⌘K`）、主题切换、通知铃铛（带红点）、头像。
- 滚动超过 4px 给顶栏加 `scrolled` 阴影。
- 通知铃铛与全局搜索为视觉占位；无后端能力时点击给出明确的占位反馈，不伪造通知内容。

### 3.3 默认落地页

- 登录后默认 `/content/studio`；无内容权限回退 `/dashboard`。
- 侧栏顺序按原型：运营概览、内容创作、内容库、内容配置；系统管理分组在后。

## 4. 页面蓝图

### 4.1 登录页 `/login`

- ≥640px：`grid-template-columns: 1.05fr 1fr`；<640px 单列，隐藏左侧艺术区。
- 左侧：`#12141A` 底 + 两处径向渐变（靛蓝 55%、紫 38%）+ 40px 网格遮罩 + 两个模糊光球（44px blur，9s 上下漂浮）。
- 左侧内容：品牌、30px 标语两行、13px 定位语、三段卖点（01/02/03）、页脚版权。
- 右侧：`--card` 底 + 右上径向渐变；340px 表单，38px 输入框，整宽渐变主按钮。
- GSAP 入场时间线见第 6 节。
- 保留用户名/密码/登录/错误提示；不新增第三方登录、注册、验证码。

### 4.2 运营概览 `/dashboard`

- 页头：标题 21px + 一句说明；右侧 14/30/90 天分段控件（Motion 弹簧滑块）。
- 12 列网格：
  - Hero 卡（8 列）：渐变底、光斑、点阵网格、34px 总生成量、+x% 胶囊、SVG 趋势图（GSAP 描线、面积淡入、数据点回弹、末端脉冲）。
  - KPI 区（4 列，2×2）：4 张卡，标签、25px 数值、涨跌、迷你折线；hover 抬升。
  - 状态构成（4 列）：紧凑堆叠条 + 6 行状态进度 + 提示条 + 留存率页脚。
  - 最近内容（8 列）：5 行列表，标题/智能体/时间/状态徽标/评分。
- 真实数据优先：趋势、KPI、状态分布、最近内容全部来自现有 dashboard 接口；没有序列时隐藏迷你折线，显示中性占位，不编造数字。
- 空态、未就绪、错误都留在页面内。

### 4.3 内容创作 `/content/studio`

- 页头：标题 + 说明；右侧「载入上次配置」ghost 按钮。
- ≥900px：左栏 280px；≥1240px：左栏 300px。
- 左栏卡片堆叠：智能体 7 选 1（图标 + 名称 + 描述）、创作参数 2×2、关键词标签输入、目标字数滑块、资料上传。
- 右侧：≥1240px 为「画布 + 300px 评审」两栏；否则评审区下移。
- 画布卡：标题、状态徽标、字数、版本、重生成次数；右侧复制/生成按钮；生成进度条；无衬线 Markdown 正文；底部提示与收藏。
- 生成中：进度条滑动、正文 45% 透明 + 0.3px 模糊、状态徽标呼吸；不使用全屏遮罩。
- 评审卡：104px conic 评分环（`--ring-p` 动画）、等级、4 条维度进度、关键词覆盖率与标签、重新评审/重新生成。
- 生成失败、10 次锁定、留存状态均在画布内联展示。
- 资料上传保持客户端与服务端双重校验。

### 4.4 内容库 `/content/library`

- 页头：标题 + 总数说明；右侧「新建内容」主按钮。
- 面板：标题「全部内容」+ 搜索 + 状态筛选 + 智能体筛选。
- 表格列：标题（副行 ID）、状态、智能体、创建人、重生成、更新时间、操作。
- 行 hover：靛蓝 3.5% 底 + 首列 2px 指示条；点击行打开 500px 右侧抽屉。
- 抽屉：ID eyebrow、标题、关闭按钮；Tab「正文 / 评分 / 信息」；正文用无衬线 prose，评分用评分环与维度条，信息用 `dl`。
- 分页：显示范围 + 页码；表头吸顶，无斑马纹。
- 移除批量操作。

### 4.5 内容配置 `/content/settings`

- 页头：标题 + 保存主按钮。
- ≥900px：左 190px 分区导航 + 主表单；≥1240px 右侧 280px 状态卡。
- 分区：默认提示词、评分规则。
- 表单：系统提示词 textarea；评分规则 JSON 等宽 textarea + 校验；底部 sticky 保存条。
- 右侧状态卡：已生效徽标、状态提示、版本/最后保存/生效范围/更新人、恢复默认。
- 离开未保存时二次确认。

### 4.6 系统管理页

- `/system/users`：页头 + 新建用户；筛选面板；用户表格（迷你头像、姓名/用户名、角色、状态、最后登录、操作）。
- `/system/roles`：页头 + 保存授权；≥768px 左侧 230px 角色列表 + 右侧权限面板；权限按分组两列。
- `/system/menus`：页头 + 新建菜单；导航树表格（名称、类型、路径、图标、操作）；分组行可折叠；路径用等宽字体。
- 新增/编辑：用户与菜单用 460px 弹窗；角色授权为列表 + 勾选。
- 删除必须二次确认并显示对象名称。

## 5. 组件规范

| 组件 | 规格 |
| --- | --- |
| 主按钮 | 34px 高、10px 圆角、`--accent-grad` 渐变底、白字、内高光 + 靛蓝阴影；hover 上移 1.5px；active 缩放 0.985 |
| 次按钮 | 白底、`--input` 边框、`--faint` 文字；hover 上移 1px |
| 图标按钮 | 32px、9px 圆角；hover 上移 1px；active 缩放 0.94 |
| 分段控件 | 白底容器 + 白色滑块 + 靛蓝文字；滑块用 Motion 弹簧（stiffness 420 / damping 34） |
| Tab | 下划线 2px、`scaleX` 过渡；active 靛蓝 |
| 徽标 | 全圆角、11px；green/indigo/amber/gray/rose 五套；暗色单独取值 |
| 输入 | 34px、9px 圆角；focus 靛蓝边框 + 4px 10% 光晕 |
| 表格 | 13px；表头 11px + 3% 字距；行 hover 靛蓝 3.5%；数字右对齐等宽 |
| 卡片 | `--card`、1px 边框、14–16px 圆角、`--shadow-card`、20px 内边距 |
| 抽屉 | 500px、右侧弹簧滑入、遮罩 2px 模糊、200–300ms |
| 弹窗 | 最大 460px、18px 圆角、`--shadow-pop`、弹簧入场 |
| Toast | 底部居中黑色胶囊，2.2s 后消失，弹簧入场/退出，可手动关闭 |
| 评分环 | 104px conic-gradient，中心 26px 等宽数字 |
| 关键词标签 | 圆角胶囊；命中靛蓝，未命中玫红底 |
| 空态 | 居中说明 + 主操作；不使用 mono 破折号 |

## 6. 动效系统

### 6.1 分层

1. **CSS**：入场、hover、进度、徽标、生成中、光球漂浮。
2. **Motion**：数字滚动、分段滑块、Toast、抽屉、弹窗、列表 stagger、chip 增删、智能体切换。
3. **GSAP**：页面切换、评分环、趋势图、ScrollTrigger 视差、登录时间线。

### 6.2 CSS 动效

- `.enter`：`fadeUp 550ms var(--ease-swift) backwards`，`--d` 控制 stagger。
- `.swap`：`fadeUp 350ms`。
- 关键帧：`fadeUp`、`fadeIn`、`popIn`、`chipOut`、`draw`、`grow`、`drift`、`floatY`、`pulseDot`、`genSlide`、`pulseOpacity`、`stackIn`、`badgePop`、`shimmer`。
- 进度条 `grow` 用 `--w` 与 `--d`；评分环在 reduced-motion 下直接落到 `--p`。
- hover 过渡 120–300ms；按钮使用 `--ease-spring`。

### 6.3 Motion

| 场景 | 参数 |
| --- | --- |
| 数字滚动 | 900ms，`[0.33,1,0.68,1]`，保留前缀/后缀/千分位/小数 |
| 分段滑块 | spring `stiffness: 420, damping: 34` |
| Toast | 入场 spring 420/30；退出 240ms；2200ms 后消失 |
| 抽屉 | 入场 spring 300/32；退出 300ms |
| 弹窗 | 入场 spring 320/28；退出 200ms |
| 列表 / 抽屉内容 | opacity + y，stagger 50ms |
| chip 新增/删除 | spring 500/26；删除 180ms 缩放淡出 |
| 智能体切换 | 图标 spring 460/20 |

### 6.4 GSAP

- **页面切换**：`opacity 0→1`、`y 8→0`、350ms `power2.out`，完成后 `clearProps`。
- **评分环**：`--ring-p` 0 → 目标值，1150ms `power3.out`，延迟 150ms。
- **趋势图**：网格淡入 stagger 40ms → 主线描线 1100ms → 面积 800ms → 数据点 `back.out(2)` stagger 55ms → 末端脉冲循环 2400ms。
- **滚动编排**（仅 dashboard hero）：光斑 14s 往返漂移 + 滚动 `yPercent 18` scrub；网格 `backgroundPosition` 120px scrub。
- **登录时间线**：品牌 → 标语 → 定位语 → 卖点 stagger → 表单标题/说明/字段/按钮 → 光球；光球 9s 往返漂浮。
- 所有 GSAP 只在客户端组件中运行；离开页面或路由变化时 `revert()` / `kill()`，避免重复时间线。

### 6.5 降级与性能

- `prefers-reduced-motion: reduce`：禁用全部 animation/transition；直接落到最终状态（进度条宽度、评分环、生成中正文不模糊）。
- 动画库懒加载：GSAP/ScrollTrigger 只在需要页面动态 import；Motion 同样按需加载。
- 只对 `opacity`、`transform`、`stroke-dashoffset`、`background-position`、自定义属性 `--ring-p` 做动画；避免布局抖动。
- ScrollTrigger 只在 dashboard hero 挂载，且路由离开时销毁。

## 7. 状态与反馈

| 场景 | 处理 |
| --- | --- |
| 页面加载 | 骨架屏，不用全屏 spinner |
| 列表为空 | 一句说明 + 一个主操作 |
| 接口失败 | 内联错误 + 重试 |
| 生成中 | 画布内进度条 + 呼吸徽标 + 正文弱化；禁用重复提交 |
| 生成失败 | 内联错误原因 + 重试，计入重生成次数 |
| 10 次上限 | 内联锁定提示，禁用重生成，仅允许确认留存 |
| 保存成功 | Toast「已保存」 |
| 删除成功 | Toast + 局部刷新 |
| 409 冲突 | 内联提示，不用全局错误页 |
| 占位能力 | 通知/全局搜索等未接入能力：明确提示「暂未接入」，不伪造数据 |

## 8. 文案与 i18n

- 全部业务文案中英双语，key 集合一致；原型中文文案作为中文基线。
- 错误文案 = 发生了什么 + 怎么办。
- 空状态 = 一句说明 + 一个主操作。
- 登录页三段卖点为静态产品文案，必须同时维护中英文。
- 时间格式 `YYYY-MM-DD HH:mm`；数字使用 `tabular-nums`。
- 禁止为对齐原型而硬编码中文到组件；一律走 next-intl。

## 9. 无障碍

- 核心文字对比度 ≥ 4.5:1。原型的 `--muted-foreground` / `--faint` 若达不到，只用于非关键元信息；关键说明改用 `--foreground` 或加深后的等价 token。
- 焦点：2px `--ring` 描边 + 2px offset；所有图标按钮有 `aria-label`。
- 状态不能只靠颜色；徽标需带文字。
- 抽屉、弹窗、用户浮层支持 `Esc` 关闭；点击遮罩关闭。
- 注释所有装饰性光斑/网格 `aria-hidden="true"`。
- 支持 `prefers-reduced-motion`。
- 点击目标桌面 ≥32px。

## 10. 响应式

| 宽度 | 行为 |
| --- | --- |
| ≥1240px | 创作页左栏 300px + 画布 + 300px 评审；配置页显示右侧状态卡 |
| 900–1239px | 创作页左栏 280px；评审区下移；配置页隐藏状态卡 |
| 641–899px | 顶栏内边距 14px；页面内容 14px |
| ≤640px | 侧栏 64px 图标栏；隐藏搜索；表格容器横向滚动；登录页单列 |
| ≤900px | 内容区缩小内边距 |

- 移动端内容编辑不做；列表与详情只读可用。

## 11. 依赖与性能

新增运行时依赖：

| 依赖 | 用途 | 约束 |
| --- | --- | --- |
| `gsap` | 页面切换、评分环、图表、ScrollTrigger 时间线 | 客户端动态 import |
| `gsap/ScrollTrigger` | dashboard hero 滚动编排 | 仅 dashboard 挂载 |
| `motion`（`motion/react`） | 弹簧交互、数字、Toast、抽屉、弹窗 | 按需动态 import |

- 同步更新 `scripts/check-bundle-budget.mjs` 的预算，并在 ticket 验收中记录实际体积。
- 动画库不得进入首屏 critical path；首屏仍由 RSC + CSS 打底。
- 继续遵守 typed client、RSC、token、i18n、消毒、上传双重校验等硬规则。

## 12. 占位元素政策

原型中以下元素没有后端能力，保留视觉与交互槽位，但不伪造业务数据：

| 元素 | 处理 |
| --- | --- |
| 通知铃铛 + 红点 | 保留视觉；点击提示「通知暂未接入」；红点视为装饰，接口就绪后替换 |
| 全局搜索 / ⌘K | 保留入口；点击/快捷键给出占位反馈；命令面板不在本次视觉范围 |
| 登录页三段卖点 | 保留静态文案，中英双语维护 |
| KPI 迷你折线 | 有趋势序列时使用真实数据；无数据时显示中性占位线，不显示 mock 数值 |
| KPI / hero 数值 | 全部来自 dashboard 接口；未就绪时显示「—」或未就绪态 |
| 用户/角色/菜单示例行 | 使用真实接口数据；原型数据仅用于版式验收 |

## 13. 验收清单

### 页面覆盖

- [ ] 登录页
- [ ] 运营概览
- [ ] 内容创作工作台
- [ ] 内容库 + 详情抽屉
- [ ] 内容配置
- [ ] 用户管理
- [ ] 角色管理
- [ ] 菜单管理

### 视觉覆盖

- [ ] token、渐变、玻璃层、圆角、阴影与原型一致
- [ ] 侧栏 212/64px、顶栏 56px、内容区间距一致
- [ ] 亮色与暗色均逐屏对照原型
- [ ] 1440px、1024px、390px 三档
- [ ] 图标线宽、字号、间距与原型一致

### 动效覆盖

- [ ] 入场 stagger、页面切换
- [ ] 数字滚动、评分环、趋势图描线
- [ ] 抽屉/弹窗/Toast/分段控件弹簧
- [ ] dashboard 滚动编排、登录页时间线
- [ ] `prefers-reduced-motion` 下全部降级
- [ ] 路由切换不残留时间线、不重复绑定 ScrollTrigger

### 状态覆盖

- [ ] 默认 / hover / focus / disabled / loading / empty / error
- [ ] 生成中 / 生成失败 / 10 次锁定 / 已留存

### 工程门槛

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm test:e2e`
- [ ] `pnpm check:messages`
- [ ] `pnpm check:client-secrets`
- [ ] `pnpm check:bundle`（预算已按新依赖校准）

## 14. 与旧规范的差异

| 旧规范（Editorial Precision v2） | 新方向（Direction C） |
| --- | --- |
| 信号青柠 + 暖中性 | 靛蓝 + 冷灰 |
| 边框优先，阴影仅浮层 | 边框 + 阴影 + 光晕并用 |
| 禁止渐变、玻璃拟态、大圆角 | 允许并作为基础语言 |
| 只动 opacity/transform；禁止页面切换与视差 | CSS + Motion + GSAP 分层动效 |
| 侧栏 232/56，顶栏 52 | 侧栏 212/64，顶栏 56 |
| 登录页禁止卖点列表 | 保留三段卖点 |
| dashboard 指标条，不包卡片 | KPI 卡片 + hero 渐变卡 |
| 抽屉 480，弹窗 560 | 抽屉 500，弹窗 460 |
| 正文衬线 | 正文无衬线 |
| 无新增依赖 | 新增 gsap / ScrollTrigger / motion |
| 通知中心不做 | 保留视觉占位 |
