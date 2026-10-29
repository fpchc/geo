# Issue tracker: Local Markdown

本工作根使用 local markdown 追踪 spec、tickets 与规划；所有路径相对 `frontend/`。**不使用 `.scratch/`**。

## 约定

- **spec**：`docs/specs/<feature-slug>.md`；一个能力域需要多份文档时用 `docs/specs/<feature-slug>/`，入口为 `README.md`。
- **ticket**：当前为 web-admin MVP 单特性，使用 `docs/tickets/<NN>-<slug>.md`，从 `01` 连续编号，禁止合并成单个 tickets 文件。未来出现多特性时改用 `docs/tickets/<feature-slug>/<NN>-<slug>.md`。
- 每个 ticket 文件顶部附近用 `**Status:**` 行记录状态（`todo` / `claimed` / `done` / `blocked`）。
- 讨论与历史追加到文件底部 `## Comments` 标题下。
- 跨多个 ticket 的排期、依赖与决策地图放 `docs/planning/`。

## 技能要求 "publish to the issue tracker" 时

- spec 写到 `docs/specs/`；
- ticket 写到 `docs/tickets/`；
- 目录不存在则创建。

## 技能要求 "fetch the relevant ticket" 时

读取引用路径对应的文件。用户通常会直接给出路径或 issue 编号；只有编号时按 `docs/tickets/**/<NN>-*.md` 查找。

## Wayfinding 操作

供 `/wayfinder` 使用。**map** 是一个文件，每个决策 ticket 一个子文件。

- **Map**：`docs/planning/map.md` — 存放 Notes / Decisions-so-far / Fog 正文。当前只有一个 effort（web-admin MVP）；出现第二个 effort 时改用 `docs/planning/<effort>/map.md`。
- **子 ticket**：`docs/planning/issues/NN-<slug>.md`，从 `01` 编号，正文写问题。`Type:` 行记录类型（`research` / `prototype` / `grilling` / `task`）；`Status:` 行记录 `open` / `claimed` / `resolved`。
- **阻塞**：顶部附近 `Blocked by: NN, NN`。所列文件全部 `resolved` 即解除阻塞。
- **Frontier**：扫描 `docs/planning/issues/`，找 open、unblocked、unclaimed 的文件；编号最小者优先。
- **Claim**：开工前先写 `Status: claimed` 并保存。
- **Resolve**：在 `## Answer` 下追加答案，置 `Status: resolved`，再把 context pointer（要点 + 链接）追加到 `map.md` 的 Decisions-so-far。
