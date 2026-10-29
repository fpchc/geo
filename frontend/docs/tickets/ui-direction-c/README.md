# UI 重做：Direction C（Indigo Studio）

设计主源：[ui-direction-c.html](../../preview/ui-direction-c.html)
工程规范：[ui-redesign spec](../../specs/ui-redesign.md)
决策记录：[ADR-0007](../../adr/0007-ui-direction-c.md)

## 依赖顺序

- 01 可立即开始
- 01 → 02
- 01 + 02 → 03 / 04 / 05
- 03 + 04 + 05 → 06

## Tickets

| # | 标题 | 状态 |
| --- | --- | --- |
| 01 | tokens + App Shell + 基础组件 | done |
| 02 | 动效基座：GSAP / Motion / Toast / Drawer / Segmented | done |
| 03 | 内容创作工作台 | done |
| 04 | 内容库抽屉 + 登录页 | done |
| 05 | 运营概览 + 系统管理页 | done |
| 06 | 响应式 / 暗色 / 无障碍 / 性能 / 验收 | done |

## 工作方式

- 每个 ticket 一次会话；先 claim（`Status: claimed`），完成后写 `## Comments` 并改 `done`。
- 视觉以原型为准；行为、权限、i18n、数据真实性以 spec 为准。
- 跨目录的 backend 改动不在本组 ticket 内，需要时另开 backend ticket。
- 提交前至少跑该 ticket 声明的验证命令；06 跑完整门槛。
