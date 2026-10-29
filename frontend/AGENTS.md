<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 项目常驻规范 (AGENTS.md)

> 经 `CLAUDE.md` 的 `@AGENTS.md` 每次对话自动加载。本文件只放常驻规则与触发指针；规范正文在 `docs/constraints/README.md`，文档总索引在 `docs/README.md`。

## 0. 边界约束（最高优先级）

**工作边界 = 当前项目目录 `D:\vibecoding\geo\frontend`（即本会话的工作根）；即使会话从仓库根或其他目录启动，也不得扩大边界。**

- 任何文件读取、创建、修改、删除、移动，以及会产生副作用的 shell 命令，解析后的绝对路径**必须**落在边界内。
- **禁止**修改边界外的任何内容，包括但不限于 `../backend/`、`../.github/`、`../.claude/`、`../.scratch/` 与仓库根文件。
- **禁止**用 `..`、绝对路径、符号链接、脚本参数等方式绕出边界。
- **禁止**从 frontend 执行会改写仓库其他部分的操作：跨目录 `git add` / `git commit` / `git mv`、根级依赖安装、全仓格式化等。
- 边界外内容默认不读；确需只读诊断时先说明理由并取得授权。
- 若任务确实需要修改边界外文件：**先停止，向用户说明目标路径、改动内容与原因，取得显式授权后再执行**。禁止先改后报。
- 用户对某次跨边界操作的授权仅对该次操作有效，不推广到后续任务。
- 跨目录需求：在 `frontend/` 内给出方案、补丁或 ticket 描述，交用户或对应目录的会话执行。

违反本节等同于违反最高优先级约束。

## 1. 会话启动

1. 涉及页面、路由、组件或数据获取时，先读 `node_modules/next/dist/docs/` 中对应指南；Next.js 16 有破坏性变更。
2. 涉及业务术语、状态或权限概念时读 `CONTEXT.md`。
3. 不确定文档位置时读 `docs/README.md`；跨模块或结构性改动前读 `docs/specs/web-admin-mvp-nextjs.md` 与 `docs/constraints/README.md`。

## 2. 行为约束

- 工作根：`D:\vibecoding\geo\frontend`。边界与越界授权规则见 §0。
- 先方案后修改：非小修任务先给方案，用户确认后再改代码。
- 只读工作根内的源码与配置；跳过 `node_modules/`、`.next/`、`test-results/`、`playwright-report/` 与敏感文件（`.env*`、`*.pem`、`*.key`）。

## 3. 任务触发映射

命中下表即自动加载并遵守对应文档，无需用户提醒；同一任务命中多行时全部加载。

| 任务 | 正文 |
| --- | --- |
| 新增/修改页面、组件、数据获取、状态管理 | `docs/constraints/README.md` 第 1、4 节 |
| 新增/修改 API 调用、生成类型、错误处理 | `docs/constraints/README.md` 第 2 节；`openapi.json` |
| 登录、会话、刷新、401、CSRF | `docs/constraints/README.md` 第 3 节 |
| 权限码、菜单树、导航、按钮可见性 | `docs/constraints/README.md` 第 5 节；`CONTEXT.md` |
| Markdown、上传、CSP、安全头、脱敏 | `docs/constraints/README.md` 第 6 节 |
| 文案、日期/数字格式化、语言切换 | `docs/constraints/README.md` 第 7 节 |
| 测试、E2E、stub backend、MSW | `docs/constraints/README.md` 第 8 节 |
| 改 CI、性能预算、监控 | `docs/constraints/README.md` 第 9、10 节 |
| 领取/推进任务、拆分 spec | `docs/tickets/`、`docs/planning/`、`docs/agents/issue-tracker.md` |

## 4. 不可协商的硬规则

细节与例外见 `docs/constraints/README.md`；以下规则每轮都适用：

- 单体 Next.js 16 App Router 应用；不引入 monorepo、共享 packages 或跨应用引用。
- 所有后端数据访问经 `src/lib/api` 的 typed client；客户端组件不拼装后端 URL、不读取 token。
- `openapi.json` 是唯一契约源；改契约先更新快照再 `pnpm openapi:generate`，CI 跑 `pnpm openapi:check`。
- token 只存 httpOnly cookie；浏览器 JS 不接触 token；写操作校验来源。
- 首屏数据在 RSC 取；客户端交互用 TanStack Query；Zustand 只存 UI 状态。
- 业务文案中英双语且 key 集合一致；CI 跑 `pnpm check:messages`。
- Markdown 渲染前消毒；上传在客户端与服务端双重校验。
- 提交前跑 `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e`。

## 5. 文档地图

| 文档 | 用途 | 何时读 |
| --- | --- | --- |
| `docs/README.md` | 文档总索引 | 不确定文档位置时 |
| `CONTEXT.md` | 领域词汇与反义词 | 涉及业务术语、状态、权限概念时 |
| `docs/specs/` | 需求与设计 spec | 理解功能范围、验收标准时 |
| `docs/constraints/README.md` | 架构、契约、认证、数据、测试、CI 约束 | 写代码、评审、改 CI 时 |
| `docs/tickets/` | 实施 tickets | 领取 / 推进具体任务时 |
| `docs/planning/` | wayfinder 地图与决策 tickets | 排期、依赖、未定项时 |
| `docs/adr/` | 架构决策记录 | 改动涉及重写、RBAC、契约、生成链路时 |
| `docs/agents/` | tracker / triage / domain 配置 | `to-spec` / `to-tickets` / `triage` 时 |
| `docs/acceptance.md` | 验收记录 | 发布 / 验收时 |
| `openapi.json` | API 契约快照；`src/lib/api/generated.ts` 由它生成 | 新增/修改 API 调用时 |

## 6. 文档写入硬约束

- 项目规范只写在 `docs/`（`specs/`、`tickets/`、`planning/`、`constraints/`、`adr/`）与根目录 `AGENTS.md`、`CONTEXT.md`。
- `CLAUDE.md` 只保留 `@AGENTS.md`，不写任何约束或文档指针。
- 新文档一律落 `docs/`；`.ai/`、`.scratch/` 不作为文档来源。
- `.claude/` 只放工具配置与薄指针；规范正文写在 `docs/constraints/`。
- 领域词汇写 `CONTEXT.md`；难以逆转的决策写 `docs/adr/`。
- spec 与 ticket 的命名与状态规则见 `docs/agents/issue-tracker.md`。

## Agent skills

### Issue tracker

本仓库使用 local markdown：spec 与 tickets 存放在 `docs/specs/` 与 `docs/tickets/`，规划存放在 `docs/planning/`。详见 `docs/agents/issue-tracker.md`。

### Triage labels

保留默认五类标签：`needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`。详见 `docs/agents/triage-labels.md`。

### Domain docs

采用 single-context：`CONTEXT.md` + `docs/adr/` 位于 `frontend/` 根。详见 `docs/agents/domain.md`。
