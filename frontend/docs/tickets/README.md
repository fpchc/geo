# web-admin MVP 实施 tickets

Next.js 单体重写的 tracer-bullet tickets，来源是 [架构 spec](../specs/web-admin-mvp-nextjs.md)。每个 ticket 切穿 RSC、客户端、契约与测试，完成即可演示或验证。

## UI 方向 C（2026-10-29）

视觉重做的 tickets 在 [`ui-direction-c/`](./ui-direction-c/README.md)，与下面的 MVP tickets 并行推进。旧的 [`ui-redesign/`](./ui-redesign/README.md)（Editorial Precision v2）已标记 superseded，不再领取。

## 依赖顺序

- **可立即开始**：01
- 01 → 02, 17
- 02 → 03, 16
- 03 → 04, 08, 10, 11, 12, 13, 14
- 04 → 05, 06
- 06 → 07
- 08 → 09
- 14 → 15
- 04–15 → 18
- 16, 17, 18 → 19
- 20 → 21
- 22 可随时并行

## 外部前置

- **P0（阻塞 03 的收口 / 21）**：后端改动清单见 [20 — 后端导航树前置改动](./20-backend-nav-tree-prerequisites.md)。核心是 `/menus/tree` 登录可读并按用户过滤、种子路径对齐前端路由、补 `/dashboard` 节点、修复 `content_viewer` 种子。由 backend 会话执行。
- **P1（影响 14 的生产验收）**：看板聚合 API。14 可先用 stub 契约完成前端，真实上线依赖后端。

## 进度

- 01 已完成（2026-10-22）。
- 02 已完成（2026-10-22）。
- 16 已完成（基线；Markdown/上传校验留给 04/05）。
- 17 已完成（Dockerfile 与 CI image job 就绪；本机 Docker daemon 未启动，未做本地镜像构建）。
- 03 已完成（菜单 provider 为前端模拟，后端“我的菜单”接口就绪后替换）。
- 04 已完成。
- 05 已完成。
- 06 已完成。
- 07 已完成。
- 10 已完成。
- 11 已完成。
- 14 已完成（真实聚合 API 未上线时降级为空态）。
- 15 已完成（ECharts 按需动态加载）。
- 12 已完成（角色管理 + 菜单授权；用户导航变化待真实菜单 provider）。
- 13 已完成（菜单树 CRUD；侧边栏反射待真实菜单接口）。
- 18 已完成（key 对齐 CI、校验文案 i18n、数字格式化、错误码映射）。
- 19 已完成（验收记录见 `docs/acceptance.md`；真实后端 P0/P1 与 Docker 本地 smoke 为剩余外部事项）。
- 20 新增（2026-10-27，待 backend 会话执行）：导航树前置改动。
- 21 实现完成、未切换（2026-10-27）：`NAV_SOURCE=backend` 走后端导航树；默认仍为 `static`，切换依赖 20。
- 22 已完成（2026-10-27）：就绪探针与用户/角色/菜单详情接口补齐。

## 工作方式

每个 ticket 一次会话。完成后勾选验收项；阻塞解除后即可领取。不要跳过 03 的 P0 依赖直接上线。
