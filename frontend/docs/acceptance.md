# web-admin 生产 MVP · 验收记录

日期：2026-10-22
范围：`frontend/` 的 web-admin Next.js 单体重写；后端 FastAPI 契约不变。

## 验收矩阵

| 领域 | 验收内容 | 证据 |
| --- | --- | --- |
| 主链路 | 登录 → 生成 → 评审 → 重新生成 → 留存 | `tests/e2e/content-studio.spec.ts` |
| RBAC | 四角色导航差异、越权 URL 拦截 | `tests/e2e/rbac.spec.ts` |
| 失败路径 | 任务失败/过期、409 锁定、401 刷新、上传超限 | `tests/e2e/content-studio.spec.ts`、`tests/e2e/auth.spec.ts` |
| 内容库 | 分页、筛选、URL 状态、详情/版本/评分、viewer 只读 | `tests/e2e/content-library.spec.ts` |
| 看板 | KPI、状态/评分分布、趋势、空态与错误态 | `tests/e2e/dashboard.spec.ts` |
| 系统管理 | 用户 CRUD、角色授权、菜单树 CRUD | `tests/e2e/system-users.spec.ts`、`system-roles.spec.ts`、`system-menus.spec.ts` |
| 双语 | 工作台/内容库/看板/系统页中英切换与持久化 | `tests/e2e/i18n.spec.ts`、`pnpm check:messages` |
| 安全 | CSP/安全头、Markdown 消毒、上传双重校验、依赖审计 | `tests/e2e/security.spec.ts`、`pnpm audit` |
| 性能 | 首屏 JS、LCP、CLS | `pnpm check:bundle`、`tests/e2e/performance.spec.ts` |
| 部署 | standalone 构建、健康/就绪探针、镜像构建与回滚 | `Dockerfile`、CI `image` job、`deploy/README.md` |

## 命令结果

| 命令 | 结果 |
| --- | --- |
| `pnpm lint` | ✅ |
| `pnpm typecheck` | ✅ |
| `pnpm test` | ✅ 34 files / 142 tests |
| `pnpm build` | ✅ |
| `pnpm test:e2e` | ✅ 50 tests（含 2 个性能用例） |
| `pnpm check:messages` | ✅ zh-CN / en-US key 一致 |
| `pnpm check:bundle` | ✅ 286.3 KiB gzip / 600 KiB |
| `pnpm audit --prod --audit-level high` | ✅ 无已知漏洞 |
| standalone `server.js` + `/api/health` | ✅ 本地验证 |

## Direction C UI 验收记录（2026-10-29）

范围：`docs/tickets/ui-direction-c/` 01–06；视觉主源 `docs/preview/ui-direction-c.html`。

### 响应式与主题

- 1440 / 1024 / 390 三档，登录、运营概览、内容工作台、内容库、内容设置、用户、角色、菜单逐页截图审计亮色与暗色。
- 390px 全页面 `document.documentElement.scrollWidth - window.innerWidth <= 1`；表格保持横向滚动容器。
- 390px 内容工作台与内容设置进入只读态；登录页单列；弹窗与内容库抽屉均在视口内。
- 主题在登录页与 Shell 均可切换，刷新后保持；暗色 token、表格、卡片、hero、图表与登录右侧面板完成对照。

### 无障碍与动效

- 全站交互焦点回退为 2px `--ring` 描边；图标按钮具备 `aria-label`；表单字段具备关联标签或 `aria-label`。
- 弹窗、内容库抽屉、用户浮层均支持 `Esc` 关闭；抽屉焦点恢复、权限复选框焦点环有 E2E 覆盖。
- 键盘完成生成、评审、保存设置与删除确认；`tests/e2e/responsive-a11y.spec.ts` 覆盖。
- `prefers-reduced-motion: reduce` 下动画与过渡关闭，趋势图直接落终态；GSAP/ScrollTrigger 仍按 dashboard hero 实例清理。
- 浅色关键文本 token 已加深：`--muted-foreground` 0.60、`--success` `#047857`、`--destructive` `#be123c`；暗色 `--muted-foreground` 调至 0.55。

### 命令结果

| 命令 | 结果 |
| --- | --- |
| `pnpm lint` | ✅ |
| `pnpm typecheck` | ✅ |
| `pnpm test` | ✅ 46 files / 189 tests |
| `pnpm build` | ✅ |
| `pnpm test:e2e` | ✅ 61 tests（含 performance 与 responsive-a11y） |
| `pnpm check:messages` | ✅ 492 keys |
| `pnpm check:client-secrets` | ✅ |
| `pnpm check:bundle` | ✅ 259.7 KiB gzip / 320 KiB |

### 已知偏差

- 运营概览最近内容评分、用户最后登录显示 `—`：现有 `ContentOut` / `UserOut` 无对应字段，按占位政策不伪造数据。
- 内容设置沿用现有单列表单；原型右侧配置状态卡依赖版本/更新人契约，本次不新增接口，因此未虚构状态卡数据。
## 已知限制与外部依赖

- **后端 P0 未落地**：真实环境仍需“当前用户菜单”接口（或放宽 `/menus/tree`）与 `content_viewer` 种子修复；当前侧边栏由前端模拟菜单 provider 驱动。
- **后端 P1 未落地**：看板聚合 API；前端已定义契约，接口未就绪时显示明确降级空态。
- **Docker**：本机 Docker daemon 未启动，未在本地构建镜像；CI `image` job 负责构建与容器 smoke test，standalone 运行时已本地验证。
- **回滚**：镜像回滚为文档流程（保留上一 tag），本机未做实际回滚演练。
- **INP**：未在 E2E 中直接测量；Web Vitals 已接入，生产环境通过 Sentry/监控观测。
- **菜单/角色变更反射**：系统页已写入后端，侧边栏反射需等真实菜单接口接入。

## 上线检查清单

- [x] 所有 must-fix 缺口关闭（SSE→轮询、状态枚举、agents、401、重置密码、authority、viewer 种子模拟、空登录入口）。
- [x] 主链路 E2E 通过。
- [x] 四角色 RBAC 与越权拦截通过。
- [x] 双语切换与 key 对齐通过。
- [x] 四条失败路径通过。
- [x] 看板有数据/空/错误三态通过。
- [x] 首屏 JS、LCP、CLS 预算通过。
- [x] 错误监控、Web Vitals、安全头、CSP、Markdown 消毒、上传校验通过。
- [x] 容器镜像配置与 CI smoke job 就绪；本地 standalone 已验证。
- [ ] 真实后端 P0/P1 接口上线并联调（外部依赖）。
- [ ] 真实环境账号、菜单种子与上线验收数据准备（外部依赖）。
