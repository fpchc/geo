# 删除旧前端并以 Next.js 单体重写 web-admin

旧 frontend 是 Vben 5.7 的 pnpm monorepo，内容 POC 依赖后端不存在的 SSE、状态枚举与后端漂移、导航仍由前端静态路由控制；3–5 人团队维护多层 packages、Element Plus 封装与 Pinia 的成本高于收益。我们决定整体删除旧前端，从零重写为单体 Next.js 16 + React 19 应用：不保留 Vue/Vben 兼容层，不做渐进迁移、双跑或旧代码回退；后端 FastAPI 契约保持不变。

## Considered Options

- **增量修复 Vue POC**：改动面小，但要同时承担旧架构与新需求，且 monorepo 维护成本不会消失。
- **Vue 内重做页面**：保留 Vben 分层，仍然无法解决团队对单体与 RSC 的诉求。
- **删除后重写为 Next.js 单体**：一次性承担重写成本，换取更小的架构面、统一的服务端数据获取与 typed 契约。

## Consequences

- 旧代码从工作树删除；Git 历史只作为只读记录，不作为回退或参考实现。
- 新应用与旧应用不并行、不双跑；MVP 验收后新应用直接成为唯一实现。
- 后端契约是唯一需要对齐的边界；前端不再保留 Vben/Element Plus/Pinia/Nitro 约定。
- 现有 planning 文档中的 Vue 事实基线仅用于解释缺口，不再代表当前实现。
