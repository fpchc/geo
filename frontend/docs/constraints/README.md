# 前端约束 (Frontend Constraints)

> 约束分两类：**CI 硬约束**（机器检查）与 **Review 约束**（人工评审）。违反硬约束不得合并；违反 Review 约束需在 PR 中说明理由。
> 设计决策与范围以 [`../specs/web-admin-mvp-nextjs.md`](../specs/web-admin-mvp-nextjs.md) 为准；本文件只收敛可执行的工程约束。

## 1. 架构边界

- 单体 Next.js 16 App Router 应用；不引入 pnpm workspace、Turborepo、共享 packages 或跨应用引用。
- 应用内按业务域组织：认证、内容、看板、系统管理、共享 UI；域之间经显式接口交互。
- 服务端数据访问集中在 server-only 模块；客户端组件不拼装后端 URL、不读取 token。
- 构建期约束阻止 server-only 模块进入客户端 bundle。
- 桌面优先（最小宽度 1280px）；不承诺移动端适配。

## 2. API 契约

- `openapi.json` 是唯一契约源；`src/lib/api/generated.ts` 由 `pnpm openapi:generate` 生成并提交入库。
- CI 跑 `pnpm openapi:check`；生成结果与入库产物不一致即失败。
- 所有数据访问经 `src/lib/api` 的 typed client；RSC、Route Handlers、客户端请求与测试都不绕过它裸 `fetch`。
- 薄客户端统一处理 base URL、Authorization、`BizResponse` 解包、分页结构、错误规范化与 401 刷新；业务模块只声明「方法 + 路径 + 入参/出参」。
- multipart 上传等非标准请求保留手写封装，但复用同一认证与错误处理。
- 错误模型统一为 `{ status, code, message, details? }`；已知业务码映射到 i18n key。
- 用 `any` 逃逸契约边界属于 Review 违规；TypeScript strict 必须通过。

## 3. 认证与会话

- 登录、刷新、退出经 Next.js Route Handlers 代理后端；token 只写 httpOnly、Secure（生产）、SameSite=Lax cookie。
- 浏览器 JS 不接触 access/refresh token；客户端请求走 BFF。
- middleware 在 access token 将过期时刷新；同一会话并发请求只触发一次刷新。
- 写操作校验 `Origin` / `Sec-Fetch-Site`；不引入额外 CSRF token，除非安全评审要求。
- 401：先尝试一次刷新，失败则清理会话并跳转登录。
- 登录限流与失败锁定由后端负责；前端只展示后端返回的 429 / 锁定错误。

## 4. 数据获取与状态

- 首屏数据在 Server Components 直取，配 Suspense 与骨架屏，避免客户端首屏请求瀑布。
- 客户端交互（筛选、分页、手动刷新、轮询、mutation）用 TanStack Query v5；query key 按「资源 + 参数」稳定命名，mutation 成功后精准失效相关 query。
- Zustand 只存 UI 状态；服务端数据不复制进 Zustand。
- 表单用 React Hook Form + Zod（≤8 个字段、无复杂联动）或 TanStack Form + Zod（复杂表单）；两者共享同一份 schema。
- 认证相关请求始终动态执行，不进入共享缓存。
- 内容生成只做「提交 + 轮询」；不引入 SSE。

## 5. RBAC 与导航

- `accessMode` 为 backend；导航、面包屑与页面标题由后端菜单树生成。
- 页面与按钮权限统一使用菜单/按钮节点上的权限码；服务端用 `can()`，客户端用 `<Can>` 包裹或禁用交互。
- 前端不维护第二份权限清单；新增页面必须同时落菜单与权限码。
- 未匹配到页面的菜单显示降级页并上报，不静默 404。

## 6. UI 与安全

- Tailwind CSS v4 + shadcn/ui；颜色、间距、圆角走 CSS 变量 / design token，不写死 hex。
- 统一 Loading/Skeleton、Empty、Error、Forbidden 组件；破坏性操作统一确认。
- Markdown 用 react-markdown + rehype-sanitize 渲染；禁止原始 HTML 与脚本。
- 上传在客户端与服务端双重校验格式与大小。
- 安全头在 `next.config.ts` 统一下发；生产环境 CSP 收紧。
- 浏览器 bundle 不包含 token、API base URL 或敏感字符串；`pnpm check:client-secrets` 校验。
- Sentry `beforeSend` 脱敏 authorization / cookie / password / token / prompt / material 字段。

## 7. 双语

- next-intl；语言存 cookie，不使用 URL 语言前缀；RSC 与客户端组件共享同一套 message catalog。
- 业务文案 100% 中英；`pnpm check:messages` 校验 en-US 与 zh-CN key 集合一致，缺失即失败。
- 日期、时间、数字用 `Intl`；看板口径在页面上显式标注时区。

## 8. 测试

- 唯一主缝：Next.js 与 FastAPI 之间的 HTTP 边界；RSC、Route Handlers 与客户端请求都经同一 typed client。
- E2E（Playwright）启动真实 Next.js 应用 + stub backend；覆盖登录/刷新/登出、菜单驱动导航、四角色权限、内容主链路、双语、看板三态、系统管理 CRUD 与失败路径。
- 组件测试（Vitest + React Testing Library + MSW）与 E2E 共用 MSW handlers；只 mock 网络，不 mock 业务模块。
- 纯逻辑（状态机、轮询退避、错误码映射、Zod schema、URL 筛选序列化）用 Vitest。
- 测试外部行为与用户可见结果，不测内部状态、私有函数或 CSS 类名；不写大范围快照。
- 测试数据使用固定 fixtures；时间与随机数可注入；不调用真实模型或数据库。

## 9. 性能与可观测性

- 性能预算：首屏 JS、LCP、CLS 由 `pnpm check:bundle` 与 `tests/e2e/performance.spec.ts` 把关。
- Sentry 捕获浏览器与服务端错误，关联 release 与 sourcemap；Web Vitals 上报。
- 日志与监控不记录 token、提示词全文或资料内容。

## 10. CI 门禁

```bash
# .github/workflows/ci.yml
pnpm openapi:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:client-secrets
pnpm test:e2e

# .github/workflows/i18n.yml / budget.yml
pnpm check:messages
pnpm check:bundle
pnpm audit --prod --audit-level high
```

所有门禁必须通过才能合并。

## 11. 约束执行矩阵

| 约束 | 执行方式 |
| --- | --- |
| 单体 / 无 monorepo | review |
| 类型与契约一致性 | `pnpm typecheck` + `pnpm openapi:check` |
| 服务端/客户端边界 | `server-only` + review |
| token 不落浏览器 JS | `pnpm check:client-secrets` + review |
| 双语 key 一致 | `pnpm check:messages` |
| 测试通过 | `pnpm test` / `pnpm test:e2e` |
| 性能预算 | `pnpm check:bundle` / performance E2E |
| Markdown 消毒、上传校验、安全头 | review + E2E |
