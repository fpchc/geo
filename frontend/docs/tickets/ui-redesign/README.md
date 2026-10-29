# UI 重做：Editorial Precision v2（已取代）

> **Status: superseded（2026-10-29）**
> 视觉方向已改为 Direction C。新 tickets 见 [`docs/tickets/ui-direction-c/`](../ui-direction-c/README.md)，新规范见 [`docs/specs/ui-redesign.md`](../../specs/ui-redesign.md)，决策见 [ADR-0007](../../adr/0007-ui-direction-c.md)。
> 本目录保留为 v2 的历史实施记录，不再领取。

设计依据：[ui-redesign spec](../../specs/ui-redesign.md)
视觉决策：[ADR 0005](../../adr/0005-precision-instrument-visual-language.md)

## 依赖顺序

- 01 可立即开始
- 01 → 02
- 01 + 05 → 03
- 01 → 04

## Tickets

| # | 标题 | 状态 |
| --- | --- | --- |
| 01 | tokens + App Shell + 基础组件 | done |
| 02 | 内容创作页三栏工作台 | done |
| 03 | 内容库抽屉 + 登录页分屏 | claimed（桌面 done，移动只读待做） |
| 04 | 运营概览去卡片墙 + 系统页收口 | done |
| 05 | UI 所需的后端最小配合 | done |

## 工作方式

每个 ticket 一次会话；先跑该 ticket 的验收命令，再标记 done。跨目录的 backend 改动只在 `05` 中记录，由 backend 会话执行。