# 模块路径映射

> 最后更新：2026-10-27

| 职责 | 文件路径 |
| --- | --- |
| FastAPI 入口 + lifespan | app/main.py |
| 密码哈希(bcrypt) | app/core/security/password.py |
| 登录防护守卫（限流+锁定） | app/core/security/login_guard.py |
| 登录限流集成测试 | tests/test_auth_rate_limit.py |
| 登录锁定集成测试 | tests/test_auth_lockout.py |
| 登录守卫单测 | tests/test_login_guard.py |
| 环境变量样例 | .env.example |
| Redis 会话白名单 + 用户会话索引 + 全量撤销 | app/core/security/session_store.py |
| 登出/刷新轮换撤销集成测试 | tests/test_auth_session_revocation.py |
| 禁用/删除用户撤销集成测试 | tests/test_auth_user_disable.py |
| 泛型仓储基类 | app/repositories/base.py |
| 用户/角色/菜单仓储 | app/repositories/{user,role,menu}_repo.py |
| 用户/角色/菜单/认证服务（含 username 批量解析、导航树角色过滤） | app/services/{user,role,menu,auth}_service.py |
| 用户/角色/菜单/认证路由 | app/api/v1/{user,role,menu,auth}.py |
| 用户/角色/菜单/认证 Schema | app/schemas/{user,role,menu,auth}.py |
| 菜单种子(单一数据源，含 /dashboard 与前端路由) | scripts/menu_seed.py |
| 菜单 SQL 生成器 | scripts/gen_menu_sql.py → deploy/sql/menu.sql |
| RBAC 表迁移 | migrations/versions/6d1844fcbd60_initial_migration.py |
| 全局配置 | app/core/config/config.py（包出口 app.core.config） |
| 扩展/中间件加载 | app/core/config/loader.py |
| OpenAPI/Swagger 定制 | app/core/config/openapi.py |
| Trace ID / 当前用户上下文 | app/core/context/context.py（包出口 app.core.context） |
| 异常定义 + 错误码 | app/core/exceptions/exceptions.py（包出口 app.core.exceptions） |
| JWT 鉴权 + 权限依赖工厂 | app/core/security/security.py（包出口 app.core.security） |
| 权限码启动审计(只读，比对菜单按钮) | app/core/security/permission_scanner.py |
| Provider 注册中心 | app/core/providers/provider_registry.py（包出口 app.core.providers） |
| 通用层级树构建 | app/core/hierarchy/hierarchy.py（包出口 app.core.hierarchy） |
| 声明式基类 + 时间戳 | app/db/base.py |
| 异步 DB Session | app/db/session.py |
| RBAC 模型(User/Role/Menu，无 Permission 表) | app/models/rbac.py |
| 日志扩展（JSON/text 由 LOG_FORMAT 切换；凭据脱敏） | app/extensions/logging_ext.py |
| Redis 扩展 | app/extensions/redis_ext.py |
| DB 扩展 | app/extensions/db_ext.py |
| 路由扩展 | app/extensions/route_ext.py |
| 请求日志中间件 | app/middlewares/request_log.py |
| 幂等中间件 | app/middlewares/idempotency.py |
| 全局异常中间件 | app/middlewares/exception_handler.py |
| Provider 抽象基类 | app/providers/base.py |
| HTTP Provider 基类 | app/providers/http_provider.py |
| Provider 传输 DTO | app/providers/types.py |
| LLM Provider(通义千问) | app/providers/qwen_provider.py |
| 存储 Provider(MinIO) | app/providers/minio_provider.py |
| 爬虫命中 Provider | app/providers/crawler_provider.py |
| MinIO 扩展(lifespan) | app/extensions/minio_ext.py |
| 幂等 Key 依赖 | app/core/idempotency/idempotency.py |
| 异步任务状态机 | app/core/tasks/task_store.py |
| 内容生产模型(POC 6 表) | app/models/content.py |
| 内容 POC Schema | app/schemas/content.py |
| 内容仓储(5+setting) | app/repositories/content_repo.py |
| 内容服务(POC) | app/services/content/{agent,material,content,review,setting}_service.py |
| 提示词构建(F-08 纯函数) | app/services/content/prompt_builder.py |
| 内容路由(POC 13) | app/api/content/{agent,material,content,review,setting}.py |
| Dashboard Schema/仓储/服务/路由 | app/schemas/dashboard.py / app/repositories/dashboard_repo.py / app/services/dashboard_service.py / app/api/dashboard.py |
| 智能体种子 | scripts/agent_seed.py |
| 内容表迁移(建10表) | migrations/versions/9acba030d523_add_content_production_tables.py |
| 删权限表迁移 | migrations/versions/b1e2c3d4a5f6_drop_permission_tables.py |
| 内容 POC 对齐迁移 | migrations/versions/c7f4a1b2d3e5_align_content_tables_to_poc.py |
| 健康检查端点 | app/api/health.py |
| 健康检查响应 Schema | app/schemas/health.py |
| 内容 POC 单测 | tests/test_content_prompt.py / tests/test_content_schema.py |
| DB 依赖 | app/api/dependencies/db.py |
| 鉴权依赖出口 | app/api/dependencies/auth.py |
| 统一响应 Schema | app/schemas/response.py |
| 分页 Schema | app/schemas/pagination.py |
| Alembic 迁移环境 | migrations/env.py |
| 测试脚手架 | tests/conftest.py |
| Provider Mock 测试 | tests/test_providers.py |
| 目标架构 | docs/architecture/target.md |
| 实现快照 | docs/architecture/implementation.md |
| 模块索引 | docs/architecture/module-map.md |
| 后端约束 | docs/constraints/README.md |
| 领域词汇 | CONTEXT.md |
| 跨领域决策 | docs/adr/ |
| Agent 配置(tracker/triage/domain) | docs/agents/ |
| 内容 POC specs | docs/specs/content/ |
| 认证补强 spec | docs/specs/auth-hardening.md |
| 认证补强 tickets | docs/tickets/auth-hardening/ |
| UI 重设计 spec | docs/specs/ui-redesign.md |
