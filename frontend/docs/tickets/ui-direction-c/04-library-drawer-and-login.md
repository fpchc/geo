# 04 — 内容库抽屉 + 登录页

**Status:** done
**Blocked by:** 01, 02

## 目标

- `/content/library`：对齐原型的面板式表格、筛选、500px 详情抽屉与分页。
- `/login`：对齐原型的左右分屏、渐变艺术区、三段卖点、340px 表单与 GSAP 入场时间线。

## 范围

### 内容库 `src/components/content/library-page.tsx`

- 页头：标题 + 总数说明 + 「新建内容」主按钮。
- 面板：`panel` 形态；标题「全部内容」；搜索 + 状态筛选 + 智能体筛选。
- 表格：标题（副行 ID）、状态徽标、智能体、创建人、重生成、更新时间、操作。
- 行 hover 靛蓝底色 + 首列 2px 指示条；点击打开抽屉。
- 详情抽屉：500px；ID eyebrow + 标题 + 关闭；Tab「正文 / 评分 / 信息」；使用 02 的 drawer 原语；内容 stagger 入场。
- 分页：显示范围 + 页码；表头吸顶、无斑马纹。
- 保留真实字段（title / created_at / updated_at / username）与关键词筛选。

### 登录页 `src/app/login/page.tsx` / `src/components/login-form.tsx`

- ≥640px `1.05fr 1fr`；<640px 单列并隐藏艺术区。
- 左侧：深色底 + 径向渐变 + 网格遮罩 + 两个模糊光球；品牌、两行标语、定位语、三段卖点、页脚。
- 右侧：浅色底 + 右上径向渐变；340px 表单，38px 输入框，整宽渐变按钮。
- GSAP 时间线：品牌 → 标语 → 定位语 → 卖点 stagger → 表单字段 → 光球；光球 9s 往返漂浮。
- 保留现有登录、错误提示、主题切换与跳转逻辑；不新增第三方登录/注册。

## 非范围

- 不做批量操作、导出、拖拽排序。
- 不改认证、cookie、CSRF 与后端契约。

## 验收

- [ ] 内容库与原型一致：面板、筛选、表格、抽屉、分页。
- [ ] 抽屉打开/关闭为弹簧动画，Tab 切换有 stagger，Esc/遮罩可关闭。
- [ ] 登录页与原型一致：分屏比例、渐变、卖点、表单宽度与按钮。
- [ ] 登录页时间线在 reduced-motion 下直接终态，且不重复播放。
- [ ] 390px 下内容只读可用、登录页单列可用。
- [ ] Playwright `content-library + auth + i18n` 通过。
- [ ] `pnpm lint`、`pnpm typecheck`、`pnpm test` 通过。

## Comments

- 2026-10-29：创建。取代 ui-redesign/03。
- 2026-10-29：done。内容库改为面板形态：页头（总数说明 + 新建内容）、面板标题 + 搜索 + 状态/智能体筛选、表格（标题副行 ID、状态徽标、智能体、创建人、重生成、更新时间、操作）、`md` 以上表头吸顶、原型式分页（范围文本 + 页码窗口）。
- 抽屉改为复用 02 的 `Drawer` 原语（弹簧入场、Esc/遮罩关闭、焦点陷阱、500px），拆出 `library-drawer.tsx` 承载「正文 / 评分 / 信息」Tab，切换时子元素 stagger；评分 Tab 复用新的 `ScoreBreakdown`（从 `ScorePanel` 抽出的评分环 + 等级 + 维度条 + 关键词覆盖），`ScorePanel` 保持原行为。
- 登录页改为 `1.05fr 1fr` 分屏：左侧 `#12141a` + 双径向渐变 + 40px 网格遮罩 + 两个模糊光球、品牌、两行标语、定位语、三段卖点与页脚；右侧 `--card` + 右上径向渐变、340px 表单、38px 输入框、整宽渐变按钮。`LoginTimeline` 用 GSAP 时间线播放品牌 → 标语 → 定位语 → 卖点 → 表单字段 → 光球，完成后光球 9s 往返漂浮，`reduced-motion` 下不播放、直接终态。
- 补齐 ticket 01 遗漏的 `--accent-grad` token（主按钮、品牌标记此前无渐变背景）；`Table` / `Select` 新增可选 `containerClassName`，用于面板内嵌表格与定宽筛选。
- 文案：`Login.title` 改为「登录」并新增标语/定位语/卖点/页脚键；`Library` 新增总数说明、面板标题、Tab 与分页范围键；中英同步（448 keys）。
- E2E 调整：auth 的 h1 断言改为「登录」，新增 reduced-motion 下登录页终态用例；content-library 新增抽屉用例（500px、Tab 切换、Esc 关闭）。
- 验证：`pnpm lint`、`pnpm typecheck`、`pnpm test`（43 files / 177 tests）、`pnpm check:messages`（448 keys）、`pnpm check:bundle`（254.8 KiB / 600 KiB）；Playwright 全量 52/52（独立端口 `E2E_PORT=7102 E2E_STUB_PORT=4110`）。
- 备注：`pnpm test:e2e` 默认端口 7002 上有旧实例时会被复用并导致 BFF `fetch failed`，建议用独立端口跑。
- 2026-10-29：双轴评审后的修正：时间统一为 spec 的 `YYYY-MM-DD HH:mm`（新增 `src/lib/format/date-time.ts`，Intl `formatToParts` 拼装）；分页与行操作按钮点击目标提到 32px；删掉评分查询里不可达的 404 分支（queryFn 已把 404 归一为 `null`）；正文 Tab 改为对 Markdown 块做 stagger；`clampScore` 收回模块内。
- 已知偏差：搜索仍为回车提交（原型为输入即过滤，后端按 keyword 查询，改为逐键请求不划算）；空结果沿用表格内一行文案，未换 `EmptyState` 组件（原型即如此）。
