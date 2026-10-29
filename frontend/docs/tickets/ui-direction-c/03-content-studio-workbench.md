# 03 — 内容创作工作台

**Status:** done
**Blocked by:** 01, 02

## 目标

把 `/content/studio` 从 v2 的 360/画布/320 三栏改为原型 C 的 280–300px 左栏 + 画布 + 300px 评审，并接入统一动效原语。

## 范围

- `src/components/content/studio-page.tsx`：
  - 页头：标题 + 说明 + 「载入上次配置」ghost 按钮。
  - ≥900px 左栏 280px；≥1240px 300px。
  - 左栏卡片：智能体 7 选 1（图标 + 名称 + 描述，选中渐变底）、创作参数 2×2、关键词标签、目标字数滑块、资料上传。
  - 右侧 ≥1240px 为「画布 + 300px 评审」；否则评审下移。
- 画布卡：
  - 标题、状态徽标、字数、版本、重生成次数；复制 / 生成按钮。
  - 生成进度条 `genSlide`、正文弱化、徽标呼吸；失败/锁定/留存内联。
  - 正文改用无衬线 prose（撤销 serif 要求）。
- 评审卡：
  - 使用 `score-ring` 与维度进度条动画；关键词覆盖与标签；重新评审 / 重新生成。
- `src/components/content/score-panel.tsx`、`keyword-input.tsx`、`material-upload.tsx`、`markdown-preview.tsx`：
  - 形态与间距对齐原型；保留现有表单、查询、上传校验与 E2E 可填路径。
- 移除 v2 的卡片标题 mono 大写与青柠强调。

## 非范围

- 不改生成/评审/重生成 API 与状态机。
- 不改默认落地页逻辑（仍为 `/content/studio`）。

## 验收

- [ ] 1440px 下与原型逐屏一致：左栏卡片、画布、评审环。
- [ ] 1024px 左右栏降级合理，不出现横向溢出。
- [ ] 生成中、失败、10 次锁定、留存均内联展示。
- [ ] 评分环、进度条、chip 增删使用 02 的原语。
- [ ] 现有内容主链路 E2E（studio + i18n）通过。
- [ ] `pnpm lint`、`pnpm typecheck`、`pnpm test` 通过。

## Comments

- 2026-10-29：创建。取代 ui-redesign/02。
- 2026-10-29：done。`StudioPage` 改为 280/300px 左栏 + 画布 + 300px 评审；左栏为智能体列表、创作参数 2×2、关键词、目标字数、折叠的额外提示词、资料上传六张卡片；画布头部含标题、状态、字数、版本、重生成次数、复制与生成按钮；评审卡使用 `ScoreRing`、维度条、关键词覆盖与评审/重新生成/留存操作。
- 组件：`KeywordInput` 改为 chip 形态；`MaterialUpload` 改为虚线拖拽区；`MarkdownPreview` 去掉衬线字体并切换 C 的 prose；`ScorePanel` 扩展操作区并复用到内容详情/内容库（新 props 可选）。
- 交互：复制、收藏、载入上次配置接入 Toast；生成按钮通过 `form="studio-form"` 提交左侧表单；额外提示词默认折叠。
- E2E 调整：智能体选择从 `<select>` 改为按钮列表；额外提示词先展开再填写；生成内容标题断言限定 `level: 1`（画布 h2 与 Markdown h1 同名）。
- 验证：`pnpm lint`、`pnpm typecheck`、`pnpm test`（41 files / 164 tests）、`pnpm check:messages`（433 keys）、`pnpm check:bundle`（254.8 KiB / 600 KiB）；`content-studio` E2E 10/10、`i18n` E2E 1/1（独立端口）。
- 已知偏差：1024–1279px 评审区仍在画布下方，未实现 spec 的 44px 折叠竖条；移动端保持只读。
