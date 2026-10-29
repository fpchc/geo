# 项目常驻规范 (AGENTS.md)

> 项目：backend —— FastAPI 后端（Python 3.12）。
> 每次对话自动加载（`CLAUDE.md` 只保留 `@AGENTS.md`）。本文件是唯一常驻规则入口；规范正文在 `docs/constraints/*.md`，目标架构在 `docs/architecture/target.md`，实现快照在 `docs/architecture/implementation.md`，模块索引在 `docs/architecture/module-map.md`，领域词汇在 `CONTEXT.md`。

## 0. 边界约束（最高优先级）

**工作边界 = 当前项目目录 `D:\vibecoding\geo\backend`（即本会话的工作根）；即使会话从仓库根或其他目录启动，也不得扩大边界。**

- 任何文件读取、创建、修改、删除、移动，以及会产生副作用的 shell 命令，解析后的绝对路径**必须**落在边界内。
- **禁止**修改边界外的任何内容，包括但不限于 `../frontend/`、`../.github/`、`../.claude/`、`../.scratch/` 与仓库根文件。
- **禁止**用 `..`、绝对路径、符号链接、脚本参数等方式绕出边界。
- **禁止**从 backend 执行会改写仓库其他部分的操作：跨目录 `git add` / `git commit` / `git mv`、根级依赖安装、全仓格式化等。
- 边界外内容默认不读；确需只读诊断时先说明理由并取得授权。
- 若任务确实需要修改边界外文件：**先停止，向用户说明目标路径、改动内容与原因，取得显式授权后再执行**。禁止先改后报。
- 用户对某次跨边界操作的授权仅对该次操作有效，不推广到后续任务。

违反本节等同于违反最高优先级约束。

## 1. 会话启动

1. 先读 `docs/architecture/implementation.md` 定位模块；不要直接全量扫描 `app/`。
2. 需要跨模块改动时，读 `docs/architecture/target.md` 与 `docs/constraints/README.md`。
3. 涉及领域术语时，读 `CONTEXT.md`。
4. 每次功能完成后，按 `docs/constraints/update-memory.md` 更新 `docs/architecture/implementation.md` 与 `docs/architecture/module-map.md`。

## 2. 任务触发映射

命中下表即自动加载并遵守对应文档，无需用户提醒；同一任务命中多行时全部读取。
规范正文统一在 `docs/constraints/`，不保留 `.claude/commands/`。

| 任务 | 必读正文 |
| --- | --- |
| 新项目 / 新服务骨架生成 | `docs/constraints/scaffold.md` |
| 新增接口 / 修改 method、path、decorator、权限声明 | `docs/constraints/endpoint-permission.md` |
| 新增或修改有副作用的写接口（POST/PUT/PATCH/DELETE） | `docs/constraints/endpoint-idempotency.md` |
| 新增/修改菜单节点 / 调整菜单树 / 改菜单表结构 | `docs/constraints/menu-seed.md` |
| 骨架生成完毕 / 每次功能完成 | `docs/constraints/update-memory.md` |

## 3. 工作根与行为约束

- 工作根：`D:\vibecoding\geo\backend`。边界与越界授权规则见 §0。
- 先方案后修改：非骨架任务先给方案，用户确认后再改代码。
- 输出代码以「写代码 / 修改代码 / 生成代码」指令为前提。
- 骨架生成输出完整代码。
- 只读工作根内的源码与配置；跳过 `gemini.md`、构建产物（`venv/`、`node_modules/`、`__pycache__/`）与敏感文件（`.env`、`*.pem`、`*.key`）。

## 4. 不可协商的硬规则

细节与例外见 `docs/constraints/README.md`；以下规则每轮都适用：

- Python 3.12；所有函数/方法完整类型注解；`mypy --strict` 必须通过。
- async 路径禁止阻塞式 I/O；同步库必须用 `anyio.to_thread.run_sync` 包装。
- 响应固定 `{"code","message","data"}`；业务异常继承 `AppException`；错误码集中在 `ErrorCode`。
- 配置走 `pydantic-settings`；禁止硬编码 URL / 密钥 / 阈值。
- 数据库只用 SQLAlchemy 2.0 async；Schema 变更只走 Alembic。
- 提交前跑 `.pre-commit-config.yaml`：`ruff format` + `ruff check` + `mypy`。

## 5. 文档地图

| 文档 | 用途 | 何时读 |
| --- | --- | --- |
| `docs/README.md` | 文档总索引 | 不确定文档位置时 |
| `CONTEXT.md` | 领域词汇与反义词 | 涉及业务术语、状态、权限概念时 |
| `docs/architecture/target.md` | 目标架构、领域边界、深模块/seam | 跨模块设计、新增领域时 |
| `docs/architecture/implementation.md` | 实现快照 | 每次会话开始 |
| `docs/architecture/module-map.md` | 文件路径索引 | 定位实现时 |
| `docs/constraints/README.md` | 分层、接口、异步、测试、CI 约束 | 写代码、评审、改 CI 时 |
| `docs/constraints/*.md` | 权限码、幂等、菜单、骨架、记忆更新细则 | 命中任务触发映射时 |
| `docs/specs/` | 需求与设计 spec | 理解功能范围、验收标准时 |
| `docs/tickets/` | 实施 tickets | 领取 / 推进具体任务时 |
| `docs/adr/` | 跨领域决策 | 改动涉及账号、权限、会话、Provider 时 |
| `docs/agents/` | tracker / triage / domain 配置 | `to-spec` / `to-tickets` / `triage` 时 |
| `docs/archive/` | 历史报告（只读，不作为约束） | 追溯背景时 |

## 6. 文档写入硬约束

- **禁止**新建 `.scratch/`、`.ai/` 或 `.claude/commands/` 目录；spec、ticket、架构、约束统一写入 `docs/`。
- 规范正文只写在 `docs/constraints/`；不得在别处复制正文。
- spec 与 ticket 的落盘规则见 `docs/agents/issue-tracker.md`。
- 领域词汇写入 `CONTEXT.md`；难以逆转的决策写入 `docs/adr/`。

## Agent skills

### Issue tracker

本仓库使用 local markdown：spec 与 tickets 存放在 `docs/specs/` 与 `docs/tickets/`。详见 `docs/agents/issue-tracker.md`。

### Triage labels

保留默认五类标签：`needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`。详见 `docs/agents/triage-labels.md`。

### Domain docs

采用 single-context：`CONTEXT.md` + `docs/adr/` 位于 `backend/` 根。详见 `docs/agents/domain.md`。
