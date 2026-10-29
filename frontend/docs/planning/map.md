# web-admin 生产 MVP · Wayfinder 地图

Kind: wayfinder:map
Effort: web-admin-mvp
Status: active
Created: 2026-10-22

## Destination

为 `geo/frontend` 的 `web-admin` 产出一份决策级工程规划 + 8–12 周路线图，使其达到可容器化部署的生产 MVP：内容生产主链路稳定、运营看板有可靠聚合数据、RBAC/账号安全达标、中英双语、CI/错误监控/E2E/环境部署就绪。

## Notes

**范围**

- 只覆盖 `frontend` monorepo，且本期只交付 `apps/web-admin`。
- `web-demand` / `web-supply` 不进入本期路线图；共享只做 API 类型与请求层，不做 `packages/business`。
- 实现方式（2026-10-22 修订）：删除现有 Vue/Vben 前端与 monorepo，从零重写为单体 Next.js 应用；后端契约不变。详见 [架构 spec](../specs/web-admin-mvp-nextjs.md)。

**事实基线（2026-10-22 审计）**

以下前端事实描述的是已删除的 Vue POC，仅用于解释缺口；新实现从零重写。

- 前端：Vue 3.5 / Vite 8 / TS 6 / Pinia / Element Plus 2.14（经 Vben 封装）/ Tailwind 4。
- 后端：FastAPI + SQLAlchemy 2 + Redis；真实后端，无 Nitro Mock；`/api` 由 Vite 代理。
- 内容链路：后端只有「提交生成 + 任务轮询」；前端当前调用的 SSE / creation-options / export 无后端支撑。
- 看板：后端无聚合接口；内容列表字段只有 `id/agent_id/user_id/status/regen_count/current_version_id/params`。
- 权限：`accessMode=frontend`；system 路由无 `authority`；重置密码硬编码。
- 工程化：无 `.env*`、无有效 CI、无 E2E、无错误监控；上游 Vben 的 CI/deploy 被仓库判断拦截。
- 角色种子：`super_admin / system_admin / content_ops / content_viewer` 已存在。
- 权限补充（2026-10-22 复核）：`/menus/tree` 需要 `system:menu:list`，没有“我的菜单”接口；`content_viewer` 种子引用不存在的 menu id（222/231/233），且缺 `content:content:query`。
- 内容链路补充：studio 只调用不存在的 SSE；前端状态枚举 `ready/failed` 与后端 `generated/generate_failed` 不一致；`creation-options` / `export` 无后端支撑。
- 看板补充：内容列表无标题/时间字段，仅支持 `status` / `agent_id` 筛选；后端无导出、资料列表/回读接口。

**团队、时间、规模**

- 3–5 人，8–12 周。
- 上线规模：≤50 用户，≤500 篇内容/天。

**已定决策（charting 阶段）**

- 产物：决策级工程规划 + 路线图，不展开到每个接口/页面实现。
- API：`openapi-typescript` 生成类型 + 手写薄客户端；OpenAPI 为契约源。
- 生成链路：以后端为准，改为「提交 + 轮询」；SSE 不进 MVP。
- 权限：切换 `accessMode=backend`，菜单与按钮由后端菜单树驱动。
- 登录：仅账号密码 + 图形/滑块验证；验证码登录/注册等空实现移出 MVP。
- 部署：容器化；静态产物 + Nginx，`/api` 反代。
- 看板：后端新增聚合 API；本期只定契约，后端实现为外部依赖。
- 图表：ECharts（按需引入）。
- E2E：Playwright。
- i18n：业务文案全量中英双语；仅现代浏览器。
- CI/监控：平台暂未定，进入 ticket 决策；错误监控为上线必须项。

**工作方式**

- 每个 ticket 一次会话；先 claim（`Status: claimed`），再解决；答案写 `## Answer`，状态改 `resolved`，并在本图 Decisions so far 追加一行。
- 涉及后端接口的 ticket 只产出契约、字段、验收标准；后端实现与排期作为外部依赖记录，不进入本图。
- 加载项目规范：`docs/specs/web-admin-mvp-nextjs.md`、`docs/constraints/README.md` 与根目录 `AGENTS.md`。
- 需要时使用 `mattpocock-skills:grilling`、`domain-modeling`、`codebase-design`、`tdd`、`code-review`。
- `AGENTS.md` 硬约束优先：单体 Next.js、typed client、RSC 首屏、design token、中英双语。

## Decisions so far

<!-- 每关闭一个 ticket 追加一行：- [标题](issues/NN-slug.md) — 一句话结论 -->

- [01 · 定义 web-admin 生产 MVP 的验收标准与范围边界](issues/01-mvp-acceptance.md) — MVP 收敛为登录/工作台/内容库/看板/系统管理；POC 缺口按 must-fix/延后/不做分级；浏览器与性能门槛、主链路验收场景已定。
- [架构 spec · Next.js 单体重写](../specs/web-admin-mvp-nextjs.md) — 删除旧 Vue/Vben 前端与 monorepo，从零重写为单体 Next.js 16 + React 19；后端契约不变。
- [UI 方向 C（Indigo Studio）](../adr/0007-ui-direction-c.md) — 视觉以大圆角、靛蓝渐变、玻璃层与 GSAP/Motion 编排动效为准；取代 Editorial Precision v2；新增 gsap/ScrollTrigger/motion；默认落地仍为 `/content/studio`。

## Not yet specified

- 页面内信息架构与组件拆分（一级导航与页面集合已在 01 确定）。
- 菜单树与前端路由的最终映射、KeepAlive 与三级路由拍平。
- 全局错误/空态/加载态规范，以及请求错误的用户提示口径。
- 列表方案统一：内容库/系统页用 VxeGrid 还是保留 ElTable。
- 发布回滚、版本号与 sourcemap 管理策略（待 05/06）。
- 测试数据构造、联调环境与后端依赖排期（待 11）。
- 监控指标、告警阈值与隐私边界（待 05）。
- 翻译文案清单、审校与验收流程（待 07）。
- 安全加固细节：CSP、依赖审计、上传 MIME/内容校验（待 04/09）。
- 多端复用包的最终边界，以及未来 demand/supply 的接入方式。
- 旧页面/死代码的物理清理顺序（in/out 已在 01 确定）。
- 上线检查清单终稿与验收数据（01 已给初稿，13 终稿）。
- 看板图表交互与下钻（待 10）。
- 角色/菜单种子与前端路由的一致性校验（待 02）。

## Out of scope

- `web-demand` / `web-supply` 的页面、路由、账号体系与联调。
- 后端看板聚合、导出、登录限流/锁定的实现与排期（只定前端契约）。
- GEO 效果衡量：被引用率、首位提及、跨引擎覆盖率、复述准确度。
- 自动发布/投放、内容真实性核验、时效更新、Query 细分、量级/成本治理。
- 企业 SSO/OAuth、短信/邮箱验证码登录、旧版浏览器兼容、移动端适配。
- 超出中/英的双语种、旧前端渐进迁移或兼容层、Vben 大版本升级。
