# backend 文档索引

> 常驻规则见 `../AGENTS.md`（经 `../CLAUDE.md` 引入）。本目录是 backend 唯一的规范与需求文档入口；不使用 `.scratch/` 或 `.ai/`。

## 目录

| 目录 / 文件 | 内容 | 何时读 |
| --- | --- | --- |
| `architecture/target.md` | 目标架构、领域边界、深模块/seam | 跨模块设计、新增领域 |
| `architecture/implementation.md` | 实现快照（做了什么） | 每次会话开始 |
| `architecture/module-map.md` | 文件路径索引 | 定位实现 |
| `constraints/README.md` | 全局工程约束（分层、异步、测试、CI） | 写代码、评审、改 CI |
| `constraints/endpoint-permission.md` | 接口权限码规则 | 新增/修改接口 |
| `constraints/endpoint-idempotency.md` | 写接口幂等规则 | 新增/修改写接口 |
| `constraints/menu-seed.md` | 菜单种子与菜单树规则 | 新增/修改菜单节点 |
| `constraints/scaffold.md` | 骨架生成提示词 | 初始化新项目 |
| `constraints/update-memory.md` | 实现快照维护规则 | 功能完成后 |
| `specs/` | 需求与设计 spec | 理解功能范围 |
| `tickets/` | 实施 tickets | 领取 / 推进任务 |
| `adr/` | 架构决策记录 | 涉及账号、权限、会话、Provider |
| `agents/` | issue tracker / triage / domain 配置 | to-spec / to-tickets / triage |
| `archive/` | 历史报告（只读） | 追溯背景 |

## 写入规则

- 规范正文只写在 `constraints/`；不保留 `.claude/commands/`。
- spec 与 ticket 的命名与状态规则见 `agents/issue-tracker.md`。
- 领域词汇写 `../CONTEXT.md`；难以逆转的决策写 `adr/`。
