# 01 · 定义 web-admin 生产 MVP 的验收标准与范围边界

Type: grilling
Status: resolved
Blocked by: —

## Question

什么算 web-admin 生产 MVP 完成？本 ticket 要为后续所有 ticket 提供统一的验收口径和范围边界。

需要明确：

- 页面清单：哪些页面进 MVP，哪些移出（含 `code-login` / `register` / demos 等空实现或示例页）。
- 主链路验收场景：登录 → 内容生成 → 评审 → 留存；RBAC 越权；看板只读；中英切换。
- 现有内容 POC 的缺口分级：must-fix / 可延后 / 不做。审计已知缺口见地图 Notes。
- 系统管理页（用户/角色/菜单）是否全部保留，菜单管理是否要驱动导航。
- 非功能门槛：可用性、性能、安全、i18n、浏览器范围的最低验收线。
- 明确不做项与上线检查清单的初稿。

输出：可被 08–12 直接引用的 MVP 验收标准、页面 in/out 清单、缺口分级表。

## Answer

Resolved: 2026-10-22

### 页面 in/out

**In（MVP 必须）**

| 区域 | 页面/能力 |
| --- | --- |
| 认证 | 登录（账号密码）、退出；修改密码（自助或管理员重置，机制待 ticket 04） |
| 内容 | 内容工作台、内容库、内容详情（版本/评分）、内容设置 |
| 看板 | 运营看板（只读） |
| 系统管理 | 用户、角色、菜单 |
| 通用 | 403、404 |

**Out（本期不做）**

- `code-login`、`register`、`forget-password`、`qrcode-login` 及所有空实现入口。
- demo 页面与演示路由。
- 导出入口：后端无导出接口，本期只在 API 契约中保留，不在 UI 暴露。
- SSE 生成流：统一改为提交 + 轮询。
- 内容库按用户/日期筛选、看板下钻、评分历史（后端当前不支持或只有最新评分）。
- 版本回滚/设为当前版本（后端无接口）。

### 系统管理与导航

- 用户、角色、菜单三页全部保留。
- 菜单管理维护后端菜单树；`accessMode` 切为 `backend`，导航由 `GET /menus/tree` 驱动。
- 按钮权限码来自菜单/按钮节点的 `perm_code`，通过 `v-access:code` 使用。
- 外部依赖：后端提供“我的菜单”接口，或放宽 `/menus/tree` 的 `system:menu:list` 限制；否则 `content_ops/content_viewer` 登录后无法获得导航。

### 内容 POC 缺口分级

| 级别 | 缺口 | 处理 |
| --- | --- | --- |
| must-fix | 生成/重生成依赖不存在的 SSE 接口 | 改为 `POST /content/contents/generate` + 轮询 `GET /content/contents/tasks/{task_id}`；删除/停用 stream API |
| must-fix | 前端状态枚举 `ready/failed` 与后端不一致 | 对齐为 `configuring/generating/generate_failed/generated/reviewed/locked/retained` |
| must-fix | `creation-options` 无后端支撑 | 改用 `GET /content/agents` 与 `GET /content/agents/{id}` |
| must-fix | `export` 无后端支撑 | MVP 隐藏入口；契约延后，见 ticket 08 |
| must-fix | 401 处理未覆盖 SSE/export 等裸 `fetch` | 统一走 `requestClient`；裸请求补齐刷新/跳登录 |
| must-fix | 重置密码硬编码 | 接 `PUT /users/{user_id}/password` |
| must-fix | system 路由无 `meta.authority`；viewer 种子失效 | 补权限码；移除不存在的 menu id 222/231/233，补 `content:content:query` |
| must-fix | 登录页存在空实现入口 | 移除验证码登录/注册/二维码/忘记密码入口 |
| 可延后 | 导出实现 | 本期只定契约，后端实现为外部依赖 |
| 可延后 | 版本回滚/设为当前版本 | 后端无接口，本期不做 |
| 可延后 | 看板下钻、评分历史 | 后端无聚合/历史接口 |
| 可延后 | 内容库按用户/日期筛选 | 后端只支持 `status`/`agent_id` |
| 可延后 | 从内容库续编的状态恢复 | 留给 ticket 09 |
| 不做 | `code-login/register/qrcode/forget-password`、demo、Nitro mock 依赖 | 从 MVP 移除 |

### 非功能门槛

| 维度 | 门槛 |
| --- | --- |
| 浏览器 | Chrome / Edge / Safari 最近两个大版本；桌面 ≥1280px；不支持移动端与旧浏览器 |
| 性能 | 首屏 JS gzip ≤600KB；单路由 chunk ≤250KB；LCP ≤2.5s（办公网）；CLS ≤0.1；INP ≤200ms；看板首屏 ≤3s |
| 可用性 | 无 SLA；工作时段可用；发布允许 ≤5 分钟短停 |
| 安全 | 无 high/critical 依赖漏洞；CSP、X-Frame-Options、HSTS |
| i18n | 业务文案 100% 中英；en-US 缺 key 时 CI 失败 |
| 监控 | 前端错误全部捕获并上报；sourcemap 与 release 关联 |

公司基线若与上表冲突，以公司基线覆盖，并在 ticket 12 记录。

### 主链路验收场景

**Happy path（content_ops）**

登录 → 工作台选择智能体/参数/关键词/字数 → 提交生成 → 轮询至 completed → 详情渲染 Markdown → 评审出分 → 重新生成一次 → 留存 → 内容库可见且状态为 `retained` → 看板产量/状态分布 +1。

**RBAC**

- `content_viewer`：看不到系统管理与生成/评审/留存按钮；直接访问系统路由被拒。
- `content_ops`：可操作内容链路，不可进入系统管理。
- `system_admin`：可进入系统管理，不要求内容操作权限。
- `super_admin`：全部可见。

**i18n**

工作台、内容库、看板、系统页可切换中英；刷新后保持所选语言。

**失败路径**

- 重新生成达 10 次返回 409，内容进入 `locked`，只允许留存。
- 生成任务 `failed` 或任务过期，页面给出可重试提示。
- access token 过期触发刷新；刷新失败统一跳登录。
- 上传超过 20MB 或格式不在 `txt/md/pdf/docx` 白名单，前端拦截并提示。

### 上线检查清单（初稿）

- [ ] 所有 must-fix 缺口关闭。
- [ ] 主链路 E2E 与四条失败路径通过。
- [ ] 四角色 RBAC 验收通过，viewer 种子修复。
- [ ] 中英切换通过，en-US 无缺 key。
- [ ] 性能预算达标（首屏、路由 chunk、LCP/CLS/INP）。
- [ ] 错误监控上报与 sourcemap/release 关联可用。
- [ ] 容器镜像可构建，健康检查、静态缓存、`/api` 反代与回滚演练通过。
- [ ] 安全头、依赖审计、上传校验通过。
- [ ] 环境变量、账号与上线验收数据就绪。
- [ ] 明确不做项已从 UI 与路由移除。

### 对外部依赖

- 看板聚合 API（ticket 10 定契约，后端另行排期）。
- “我的菜单”接口或 `/menus/tree` 权限调整（backend 模式前置）。
- 导出接口（本期不做，ticket 08 只定契约）。
- 登录限流/失败锁定（ticket 04 只定前端提示与契约）。
- 自助改密接口（若 ticket 04 决定不做，MVP 由管理员重置）。

### 对后续 ticket 的约束

- 08：状态机使用后端 7 态；提交 + 轮询；409 锁定与任务过期必须覆盖。
- 09：工作台交互以本 ticket 的 in/out 为准；续编状态恢复与版本回滚在 09 再定。
- 10：看板只读，本期不做下钻；聚合接口是外部依赖。
- 11：E2E 至少覆盖主链路、RBAC、i18n 与失败路径。
- 12：性能预算采用上表数值；如需调整必须在 12 中给出依据。
