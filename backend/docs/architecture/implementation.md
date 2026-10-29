# 架构快照

> 最后更新：2026-10-27（v11）
> 目标架构见 `target.md`；约束见 `../constraints/README.md`；领域词汇见 `../../CONTEXT.md`。

## 已完成模块

| 模块路径 | 职责 |
| --- | --- |
| app/main.py | FastAPI 入口 + create_app 工厂 + lifespan 钩子调度 + docs 配置注入 |
| app/core/config/ | 配置子包：config(设置) / loader(装配) / openapi(JWT Bearer)；包出口 app.core.config |
| app/core/context/ | contextvars Trace ID + CurrentUser；包出口 app.core.context |
| app/core/exceptions/ | AppException 基类 + ErrorCode 枚举；包出口 app.core.exceptions |
| app/core/security/ | security(JWT+require_permission) / permission_scanner(启动 upsert，弃用不删)；包出口 app.core.security |
| app/core/providers/ | Provider Protocol + 运行时切换 + Depends 注入；包出口 app.core.providers |
| app/core/hierarchy/ | 通用泛型层级树（build_forest O(n) / prune / to_dict）；包出口 app.core.hierarchy |
| app/db/base.py | DeclarativeBase + 命名约定 + TimestampMixin |
| app/db/session.py | AsyncEngine + async_sessionmaker + get_session |
| app/models/rbac.py | User/Role/Menu + 两张关联表(user_role/role_menu)；无 Permission 表 |
| app/extensions/logging_ext.py | JsonFormatter/TextFormatter（LOG_FORMAT 切换）+ console/file 双输出 + stdio 强制 UTF-8 + 凭据脱敏 + 丢弃 uvicorn color_message |
| app/extensions/redis_ext.py | 异步 Redis 客户端 + lifespan 启停 |
| app/extensions/db_ext.py | DB 引擎 lifespan + 启动权限扫描 |
| app/extensions/route_ext.py | 挂载 /api/v1 路由 |
| app/middlewares/request_log.py | RequestMiddleware（ASGI）Trace ID + 计时 |
| app/middlewares/idempotency.py | X-Idempotency-Key 幂等中间件 |
| app/middlewares/exception_handler.py | 全局异常转统一 JSON |
| app/providers/base.py | abc.ABC Provider 抽象基类（仅 aclose 抽象方法） |
| app/providers/http_provider.py | 可复用 HTTP 基类：base_url/timeout/headers + Trace ID 注入 + request_json |
| app/providers/types.py | Provider 传输 DTO：LLMResult/ScoreResult/ScoreDimension/SearchHit |
| app/providers/qwen_provider.py | QwenProvider(generate/optimize/score) + Mock + build_llm_provider |
| app/providers/minio_provider.py | MinioStorageProvider(upload/download/presigned) + Mock + build_storage_provider |
| app/providers/crawler_provider.py | HttpCrawlerProvider(search) + Mock + build_crawler_provider |
| app/extensions/minio_ext.py | miniopy-async 客户端 lifespan 启停 + bucket 保障（惰性导入） |
| app/core/idempotency/ | require_idempotency_key 依赖（校验 X-Idempotency-Key 格式） |
| app/core/tasks/task_store.py | Redis 异步任务状态机 + submit_task/get_task（后台协程） |
| app/models/content.py | 内容生产 POC 6 表：Agent/Content/ContentVersion/Score/Material/SystemSetting |
| app/schemas/content.py | 内容 POC IO Schema（生成入参/版本/评分/资料/配置）；ContentOut 含标题/时间/用户名，ContentQuery 支持 keyword |
| app/repositories/content_repo.py | 5 内容仓储：agent/content/version/score/material + setting；内容分页按当前版本标题筛选，版本标题与用户名批量解析 |
| app/services/content/ | 内容 POC 服务：prompt_builder + agent/material/content/review/setting；ContentService 通过 UserService 批量补 username |
| app/api/content/ | 内容 POC 13 路由（agent/material/content/review/setting 五子路由聚合） |
| app/schemas/dashboard.py | Dashboard 概览/趋势/查询 Schema（camelCase alias） |
| app/repositories/dashboard_repo.py | Dashboard 只读内容与评分查询 |
| app/services/dashboard_service.py | Dashboard KPI、状态/评分分布、关键词覆盖、趋势聚合 |
| app/api/dashboard.py | /dashboard/overview 与 /dashboard/trends |
| scripts/agent_seed.py | 7 个创作智能体种子数据 |
| app/api/health.py | /health 与 /health/ready 探针 |
| app/schemas/health.py | 健康检查响应 Schema（HealthOut / ReadinessOut） |
| app/api/ | API 聚合：health / auth / identity(user/role/menu) / content / dashboard |

| app/api/dependencies/auth.py | get_current_user + require_permission 出口 |
| app/schemas/response.py | BizResponse 统一响应 |
| app/schemas/pagination.py | PaginationParams / PaginatedResponse |
| app/repositories/ | 泛型 BaseRepository + user/role/menu 仓储（数据访问层） |
| app/services/ | user/role/menu/auth 服务（业务逻辑，经 repo 访问数据） |
| app/api/{auth,health}.py + app/api/identity/{user,role,menu}.py | 认证 + 用户/角色/菜单路由 |
| app/core/security/password.py | bcrypt 密码哈希（anyio 包装避免阻塞） |
| app/core/security/login_guard.py | 登录守卫：按 IP 固定窗口限流 + 按用户名失败锁定（Redis Lua 原子计数），超限/锁定 429 + Retry-After |
| app/core/security/session_store.py | Redis 会话白名单 + 用户会话索引（access→refresh）+ 全量撤销 |
| app/core/security/permission_cache.py | 权限码按角色 Redis 缓存（cache-aside + 角色/菜单变更失效） |
| app/api/dependencies/services.py | Service DI 工厂（get_{auth,user,role,menu}_service），路由经 Depends 注入 |
| scripts/menu_seed.py | 菜单种子单一数据源；35 行，含 /dashboard 与 dashboard 权限按钮，路径对齐前端真实路由 |

## 关键设计决策

- 幂等 Redis key：`idem:{method}:{path}:{key}`，TTL 86400s；SETNX 占位，处理中并发返回 409
- 分页：page/page_size + 可选 sort_by/sort_order；响应体含 items/total/page/page_size/total_pages
- 权限码：`{module}:{resource}:{action}` 三段式字面量
- 中间件执行顺序：RequestMiddleware → IdempotencyMiddleware → ExceptionMiddleware → Handler
- 扩展加载：按 `{module_name}_enabled` 配置开关控制启用
- lifespan 钩子：扩展在 init_app 阶段 append 到 app.state.startup_hooks/shutdown_hooks，main.lifespan 顺序 startup、逆序 shutdown
- RequestMiddleware 采用纯 ASGI 实现，确保 contextvars 在同一任务上下文传播
- **权限落库唯一来源=菜单按钮**（2026-07-25 重构）：删除独立 Permission 表与 role_permission 关联；权限码只落在 menus.type=BUTTON 的 perm_code（scripts/menu_seed.py 单一数据源）。用户鉴权经「角色 → role_menu → 按钮 perm_code」聚合（User.collect_permission_codes，超级用户取全部按钮码，distinct）；角色不再有 permissions 关系，授权即 assign_menus
- 启动扫描器改为**只读审计** audit_permission_codes：比对 declared_permission_codes 与菜单按钮 perm_code，日志提示 missing_in_menu（接口声明但菜单缺按钮）/ orphan_in_menu（僵尸码），不写任何表（旧 sync_permissions upsert+deprecated 策略已废弃）
- Provider 运行时切换：settings.provider_backend（http/mock），经 get_example_provider 依赖注入，测试用 dependency_overrides Mock
- 分层：路由 → service → repository → db，service 不直接写 SQLAlchemy 查询
- 认证：JWT 带 jti + type(access/refresh)；access 会话入 redis 白名单，鉴权查 `session:{uid}:{jti}` 存在性，logout 删 key 即时失效；refresh 轮换（删旧建新）
- redis key：会话 `session:{user_id}:{access_jti}`(TTL=access)、刷新 `refresh:{refresh_jti}`→`{uid}:{access_jti}`(TTL=refresh)
- **权限码缓存**（2026-07-26）：鉴权原每请求 join role→role_menu→menu 聚合权限码，改为按角色 Redis 缓存 cache-aside。key `perm:role:{role_id}`（普通用户取各角色集合并集）+ `perm:super`（超级用户全量按钮码），TTL=perm_cache_ttl_seconds(3600)兜底。失效点：role assign_menus/delete → invalidate_role；菜单按钮 perm_code update(仅 perm_code 变更)/delete(删前反查角色) → invalidate_menus（反查 role_menu 持有角色 + 超级 key）。用户改角色无需失效（并集自然反映）。聚合与查询下沉：模型 User.collect_permission_codes 已删，查询归 MenuRepository(all_button_perm_codes/perm_codes_of_role/role_ids_holding_menus)，聚合归 permission_cache.collect_permission_codes；get_redis 函数内惰性导入避免循环
- **Service DI**（2026-07-26）：路由层不再手动 `Service(session)` new（违反 `docs/constraints/README.md` §1 分层与可测性）；新增 app/api/dependencies/services.py 工厂 get_{auth,user,role,menu}_service，路由改 `svc: XService = Depends(get_*_service)`，测试可 dependency_overrides 替换
- 密码：bcrypt，经 anyio.to_thread 包装；截断 72 字节
- 菜单 ancestors：不含自身、带虚拟根 0（根="0"，二级="0,1"）；子树查询用 `id=N OR ancestors LIKE '<path>,%'` 尾分隔符防误匹配（'0,1,5' 不匹配 '0,1,50'）
- 菜单 parent_id NOT NULL DEFAULT 0（0=虚拟根，无自引用 FK）；type IntEnum 0目录/1菜单/2按钮，按钮携 perm_code；建树用 core.hierarchy（查库一次+内存 O(n)）
- 菜单种子单一数据源 scripts/menu_seed.py：gen_menu_sql.py 产出 deploy/sql/menu.sql；当前无独立 menu data migration，目标库以 deploy/sql/menu.sql 幂等导入
- session_store 惰性导入 get_redis，避免 security→extensions→db_ext→security 模块级循环导入
- Swagger/OpenAPI：docs_url/redoc_url/openapi_url 配置驱动；docs_visible = docs_enabled and not is_prod（生产强制关闭）；自定义 openapi 注入 BearerAuth 安全方案，全局默认 security
- core 分子包：按职责拆 config/context/exceptions/security/providers/hierarchy，每包 __init__ 重导出；外部从包级导入，包内跨模块走具体模块路径避免循环（如 permission_scanner ← security.security）
- 通用层级树 build_forest：O(n) 单遍 + node_map O(1) 挂载，选择器泛型解耦业务模型；查库一次得扁平表后纯内存建树，杜绝 N+1
- Provider 三层职责分离：连接生命周期在 extensions（minio_ext lifespan），调用语义在 providers（qwen/minio/crawler），Protocol + build_*_provider 工厂 + Depends 注入，settings.{llm,crawler}_backend + minio 运行时切换 mock/http/qwen
- Provider 循环导入规避：minio_provider/minio_ext 对 miniopy_async 与 get_minio 全惰性导入（函数内 import），未安装依赖时不阻塞其他层导入
- 时间戳：通用表用 TimestampMixin(server_default=func.now())；领域时间字段(scored_at 等)单独 server_default=func.now()
- 异步任务框架：Redis 状态机 pending→running→completed/failed，submit_task 返回 task_id 后 asyncio.create_task 后台执行；后台协程自建 DB Session 脱离请求作用域；_background_tasks 集合防 GC
- 强制幂等：资金/外部调用/生成流水号类写接口加 Depends(require_idempotency_key) 校验 X-Idempotency-Key（regex ^[A-Za-z0-9_-]{1,128}$），与 IdempotencyMiddleware 幂等去重协同
- LLM 温度分离：qwen_score_temperature=0.1（评分可复现）/ qwen_generate_temperature=0.7（生成多样性）
- **内容生产 POC 实现**（2026-07-27）：此前 v3 记忆声称「内容 M1-M7 28 路由/10 表/8 服务已实现」实为**失真**——业务层文件从未落盘。本次按 POC 需求（`docs/specs/content/`，F-01~F-13）真正落地业务层。
- 内容 POC 范围裁剪：迁移 9acba030d523 建的 10 表中，仅保留 agents/contents/content_versions/scores/materials；新增迁移 c7f4a1b2d3e5 drop 超范围 5 表(templates/keywords/content_keywords/publish_urls/crawl_results)，contents 加 regen_count+params(JSON)，建 system_settings(KV)。已应用远程库故用 forward 迁移(非删旧文件)对齐，downgrade 可重建
- 内容状态机(ContentStatus StrEnum)：configuring→generating→(generate_failed|generated)→reviewed→(generating[重生成]|locked|retained)
- F-08 Prompt 组装(prompt_builder.py 纯函数)：智能体提示词+参数约束句+关键词(原样命中+自然融入)+字数+额外提示词(空则默认提示词)+资料全文+md格式约束；生成端与评审端共用同套关键词规则
- F-13 重生成上限：同步请求段校验 regen_count<settings.content_regen_limit(10)→计数+1→置 generating→submit_task 提交后台生成；达上限置 locked 报 409。失败也计数(在同步段先+1)。计数/状态原子于同步段，杜绝并发重复生成
- F-07 资料：白名单 txt/md/pdf/docx(settings.material_allowed_extensions)；txt/md 直读，pdf(pypdf)/docx(python-docx)同步解析经 anyio.to_thread 包装；先按 material_max_bytes 拦原始字节，解析后按 material_max_chars(10万) 拦正文；落 MinIO + materials 表
- F-06/F-12 后台可配：system_settings KV，key=content.default_prompt/content.scoring_rule；SettingService 缺省回退内置默认(默认提示词占位 + 关键词覆盖率为主的评分规则 满分100 不固化及格线)
- 内容权限码三段式 content:{resource}:{action}：agent(list/query)/material(create)/content(list/generate/query/create)/review(score/query)/setting(query/update)；tags=content:{resource}；菜单 id=2 内容生产目录下 3 菜单 + 11 按钮；generate/regenerate/material/review 挂 require_idempotency_key
- 内容生成后台执行体 _run_generation：自建 get_sessionmaker Session + build_llm_provider(脱请求作用域)，LLM 失败置 generate_failed 后抛(由 task_store 回写 failed)，成功写 content_versions + 置 current_version_id/generated
- **单一账号模型**（2026-10-22）：系统只有 User（后台管理员）一种账号；不设 account_type，不引入 demand/supplier 独立账号体系，三端 API 相关设计全部取消
- **登录 IP 限流**（2026-10-22）：LoginGuard 以 Redis Lua 原子 INCR+EXPIRE 实现按 IP 固定窗口；AuthService.login 在凭据校验前 check；超限抛 LoginRateLimitedException（429 + Retry-After）；Redis 故障转 503
- **登录失败锁定**（2026-10-22）：按用户名累计失败次数（窗口可配），达到阈值写锁定 key（TTL 可配）；锁定期间 check 返回 locked（429 + LOGIN_LOCKED）；成功登录 reset 计数与锁定
- **会话撤销索引**（2026-10-22）：Redis Hash `user_sessions:{user_id}` 记录 access_jti → refresh_jti；登出/刷新轮换按索引精确删除 access + refresh；禁用/删除用户调用 `revoke_all_sessions` 清空全部会话
- **Swagger 响应模型**（2026-10-23）：路由以返回注解 `BizResponse[T]` 自动推断 `response_model`，不再手写 `response_model=`；禁止用 `dict[str, Any]` 作为 `data`（OpenAPI 会退化为自由对象）。菜单树用 `MenuTreeNode`（递归 children）、异步任务状态用 `GenerateTaskOut`（status 复用 TaskStatus 枚举）、健康探针用 `HealthOut`/`ReadinessOut`
- **日志格式配置化**（2026-10-23）：`Settings.log_format`（`LogFormat` StrEnum：json 默认 / text）驱动 `_build_formatter()` 选择 `JsonFormatter` 或 `TextFormatter`，console 与 file 共用；`init_app` 启动时把 `sys.stdout/stderr` reconfigure 为 UTF-8，避免非 UTF-8 stdio 下中文被 `backslashreplace` 成 Unicode 转义
- **日志乱码与凭据脱敏**（2026-10-27）：`_record_extra` 丢弃 uvicorn 的 `color_message`（ANSI 模板 + 未格式化占位符会渲染成 `\u001b[36m%d`）；`_redact` 在 formatter 出口抹除 URL userinfo 密码、`password=/*_key=*`、`Bearer/Basic` 凭据（message / extra / traceback 全覆盖，非字符串 extra 保持原类型）；`_force_utf8` 在流不支持 `reconfigure` 时改用 `stream.buffer` 包装 UTF-8，Windows 终端下把控制台输出代码页切到 65001；`LOG_FORMAT=txt` 视作 `text`
- **文档架构统一**（2026-10-27）：规范正文从 `.ai/`、`.claude/commands/`、`.scratch/` 迁入 `docs/`；`CLAUDE.md` 只保留 `@AGENTS.md`，`AGENTS.md` 承载常驻规则；目标/实现/索引在 `docs/architecture/`，工程约束在 `docs/constraints/`，spec 在 `docs/specs/`，tickets 在 `docs/tickets/`。不再保留 `.claude/commands/`；禁止再建 `.ai/`、`.scratch/` 或 `.claude/commands/`

- **导航树按用户过滤**（2026-10-27）：`CurrentUser` 增加 `role_ids`；`/menus/tree` 改为登录即可读，按角色 `role_menu` 过滤并补齐祖先目录；`/menus/tree/all` 保持 `system:menu:list`；种子新增 `/dashboard` 节点并修复 `content_viewer` 菜单绑定
- **内容库只读元数据**（2026-10-27）：`ContentOut` 增加 `title / created_at / updated_at / username`，`ContentQuery` 增加 `keyword`；列表通过当前版本标题过滤，版本标题与用户名各一次批量查询，避免 N+1
- **生成器输出路径**（2026-10-27）：gen_menu_sql / gen_user_sql 统一写 deploy/sql/，与部署文档和当前目录一致
- **Dashboard 聚合**（2026-10-27）：/dashboard/overview 返回 KPI、状态/评分分布与关键词覆盖；/trends 按日聚合内容数/失败/重生成/留存；权限码 content:dashboard:read 挂菜单按钮 800
## 待实现

- [x] 项目骨架生成
- [x] 用户管理模块（用户/角色/菜单 CRUD + 关联）
- [x] 认证（login/refresh/logout/me，JWT + redis 白名单）
- [x] Alembic 迁移脚本（初始 RBAC + 内容表 + 权限表删除 + 内容表对齐）
- [x] 内容表迁移 9acba030d523(10表)已应用远程库；7 智能体种子已导入
- [x] 权限模型重构：删 Permission/role_permission 表，权限码归口菜单按钮 perm_code；新增迁移 b1e2c3d4a5f6
- [x] 权限码按角色 Redis 缓存 + 角色/菜单变更失效；Service DI 工厂化，路由去手动 new
- [x] **内容生产 POC 业务层落地**（2026-07-27）：model/schema/repo/5 service/prompt_builder/13 路由；F-01~F-13 全覆盖；ruff+mypy(content)清、5 单测通过
- [ ] 用户须 `uv sync` 同步新依赖(pypdf 已加)后方可启动
- [ ] 用户须对目标库 `alembic upgrade head` 应用 c7f4a1b2d3e5（drop 超范围 5 表 + contents 加列 + 建 system_settings）；⚠️此迁移 drop 远程已建的 templates/keywords/content_keywords/publish_urls/crawl_results 表
- [x] Dashboard 聚合接口 `/api/v1/dashboard/overview` 与 `/trends` 已实现
- [ ] 用户须导入重生成的 `deploy/sql/menu.sql`（35 行，含 /dashboard 与 dashboard 权限按钮）和 `deploy/sql/user.sql` 到目标库
- [ ] 内容后续项(Out of Scope)：自动发布/命中核验/GEO 效果衡量/模板/关键词归一化表(POC 已 drop，后续再建)
- [ ] 内容写接口（generate/regenerate/material/review）的 `require_idempotency_key` 当前被注释；需确认后启用（客户端需携带 X-Idempotency-Key）
- [x] 修复 test_providers.py 假 Provider 未实现 request_json 的测试 bug
- [x] 后端 CI job + import-linter 契约（Step 7）
- [x] 登录 IP 限流（config + login_guard + 429/Retry-After）
- [x] 登录失败锁定（config + login_guard + 429/LOGIN_LOCKED）
- [x] Session 撤销语义（ticket 04/05：登出/轮换/禁用/删除）
- [ ] OpenTelemetry / Prometheus 实际接入（当前仅配置开关占位）
