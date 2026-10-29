# web-admin

GEO 内容运营后台，Next.js 16 单体应用。规划与决策见 `docs/`。

## 开发

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

开发服务器监听 `http://127.0.0.1:7002`。默认后端地址为 `http://127.0.0.1:7001/api/v1`，可通过 `API_BASE_URL` 覆盖。

## 脚本

- `pnpm dev`：启动开发服务器（端口 7002）
- `pnpm build` / `pnpm start`：生产构建与启动（standalone，端口 7002）
- `pnpm lint`：Biome + ESLint
- `pnpm typecheck`：TypeScript strict 检查
- `pnpm test`：Vitest + React Testing Library + MSW
- `pnpm test:e2e`：Playwright，启动真实 Next.js 应用与 stub backend
- `pnpm openapi:generate`：从 `openapi.json` 生成 API 类型
- `pnpm openapi:check`：校验生成类型是否与契约一致

## 测试缝

所有数据访问经过同一个 typed client；测试统一在 HTTP 边界替换后端：

- Playwright：真实 Next.js 应用 + `tests/e2e/stub-backend.mjs`
- Vitest + RTL：组件渲染 + MSW handlers
- 纯逻辑：Vitest

## 契约

`openapi.json` 是后端契约快照，`src/lib/api/generated.ts` 由 `openapi-typescript` 生成。后端契约变更后先更新快照，再重新生成类型。

## 可观测性与安全

- 服务端 Sentry 使用 `SENTRY_DSN`；浏览器使用 `NEXT_PUBLIC_SENTRY_DSN`（DSN 不是密钥）。
- Sourcemap 上传需要 `SENTRY_AUTH_TOKEN`、`SENTRY_ORG`、`SENTRY_PROJECT`；未配置时构建跳过上传。
- 安全头在 `next.config.ts` 中统一下发；开发环境 CSP 允许 `unsafe-eval` 与 HMR websocket，生产环境收紧。
- `pnpm check:client-secrets` 在构建后扫描客户端 bundle，禁止出现 token、API base URL 等敏感字符串。
- Sentry 事件在 `beforeSend` 中脱敏：authorization/cookie/password/token/prompt/material 字段统一替换为 `[Filtered]`。
- Web Vitals 通过 `/api/monitoring/vitals` 上报，只记录指标名、数值与评级，不记录页面内容。
