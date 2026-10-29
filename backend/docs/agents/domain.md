# Domain Docs

工程技能在探索代码库时应如何消费本工作根的领域文档。

## 探索前先读

- **`CONTEXT.md`**（位于 `backend/` 根）；或
- **`CONTEXT-MAP.md`**（若存在，指向每个上下文的 `CONTEXT.md`，按主题读取相关文件）
- **`docs/adr/`** — 读取与当前工作区域相关的 ADR。

若文件不存在，**静默继续**。不要提示缺失，也不要主动建议创建；`/domain-modeling`（经 `/grill-with-docs`、`/improve-codebase-architecture` 到达）会在术语或决策真正落定时惰性创建。

## 文件结构

本仓库为 single-context：

```text
backend/
├── CLAUDE.md
├── AGENTS.md
├── CONTEXT.md
├── docs/
│   ├── architecture/
│   │   ├── target.md
│   │   ├── implementation.md
│   │   └── module-map.md
│   ├── constraints/
│   ├── specs/
│   ├── tickets/
│   ├── adr/
│   │   ├── 0001-*.md
│   │   └── 0002-*.md
│   └── agents/
│       ├── domain.md
│       ├── issue-tracker.md
│       └── triage-labels.md
└── app/
```

## 使用词汇表词汇

输出中涉及领域概念时（issue 标题、重构提案、假设、测试名），使用 `CONTEXT.md` 定义的术语；不要漂移到词汇表明确避免的同义词。

若需要的概念尚未进入词汇表，这是一个信号：要么你在发明项目不使用的语言（重新考虑），要么存在真实缺口（记录给 `/domain-modeling`）。

## 标记 ADR 冲突

若输出与现有 ADR 冲突，显式指出，不要静默覆盖：

> _与 ADR-0007（...）冲突 —— 但值得重开，因为……_
