# web-admin 文档索引

> 常驻规则见 `../AGENTS.md`（经 `../CLAUDE.md` 引入）。本目录是 web-admin 唯一的规范与需求文档入口；不使用 `.scratch/` 或 `.ai/`，规范正文也不写进 `.claude/`。

## 目录

| 目录 / 文件 | 内容 | 何时读 |
| --- | --- | --- |
| `../AGENTS.md` | 常驻规则、触发指针、硬约束 | 每次会话 |
| `../CLAUDE.md` | Claude Code 入口 | 每次会话 |
| `../CONTEXT.md` | 领域词汇与反义词 | 涉及业务术语、状态、权限概念 |
| `specs/` | 需求与设计 spec | 理解功能范围、验收标准 |
| `constraints/README.md` | 工程约束正文（架构、契约、认证、数据、测试、CI） | 写代码、评审、改 CI |
| `tickets/` | 实施 tickets | 领取 / 推进任务 |
| `planning/` | wayfinder 地图与决策 tickets | 排期、依赖、未定项 |
| `adr/` | 架构决策记录 | 涉及重写、RBAC、契约、生成链路 |
| `agents/` | issue tracker / triage / domain 配置 | `to-spec` / `to-tickets` / `triage` |
| `acceptance.md` | 验收记录 | 发布 / 验收 |

## 写入规则

- 工程规范正文只写在 `constraints/`；spec、ticket、规划、ADR 分别落 `specs/`、`tickets/`、`planning/`、`adr/`。
- 领域词汇写 `../CONTEXT.md`；难以逆转的决策写 `adr/`。
- spec 与 ticket 的命名与状态规则见 `agents/issue-tracker.md`。
- 新文档一律写入 `docs/`；`.scratch/`、`.ai/` 不作为文档来源。
