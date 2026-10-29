# 后端目标架构 (Backend Architecture)

> 本文件描述目标架构、领域边界与模块 seam，是稳定文档。
> 实现快照与文件索引见 `implementation.md` / `module-map.md`。
> 领域词汇见 `../../CONTEXT.md`；跨领域决策见 `../adr/`。

## 1. 范围与风格

- 单体、模块化（modular monolith），按领域分组，按层解耦。
- 单账号模型：只有 User，无 `account_type`，无 demand/supplier（ADR-0001）。
- Python 3.12 + FastAPI + SQLAlchemy 2.0 async + Alembic + Redis + MinIO。
- 核心原则：深模块（小接口、深实现）、清晰 seam、接口即测试面。

## 2. 领域

| 领域 | 拥有的概念/数据 | 代码位置 |
| --- | --- | --- |
| Identity | User / Role / Menu / Auth / Session | `app/api/auth.py`、`app/api/identity/`、`app/services/{auth,user,role,menu}_service.py`、`app/models/rbac.py`、`app/core/security/` |
| Content | Agent / Material / Content / Version / Score / Setting | `app/api/content/`、`app/services/content/`、`app/models/content.py`、`app/repositories/content_repo.py` |
| Platform | config / context / exceptions / security 原语 / hierarchy / tasks / idempotency / providers / extensions / middlewares | `app/core/`、`app/extensions/`、`app/providers/`、`app/middlewares/` |

## 3. 目录结构

```text
app/
├── main.py                     # create_app + lifespan
├── core/
│   ├── config/                 # pydantic-settings + 装配 + OpenAPI
│   ├── context/                # Trace ID / CurrentUser
│   ├── exceptions/             # AppException + ErrorCode
│   ├── security/               # JWT / 密码 / 会话 / 权限缓存 / 权限审计
│   ├── providers/              # Provider Protocol + 运行时注册
│   ├── hierarchy/              # 泛型层级树
│   ├── idempotency/            # 幂等 Key 依赖
│   └── tasks/                  # Redis 异步任务状态机
├── db/                         # Base / async session
├── models/                     # SQLAlchemy 模型（rbac / content）
├── repositories/               # 数据访问
├── services/                   # 业务逻辑（identity / content）
├── schemas/                    # Pydantic I/O
├── api/
│   ├── dependencies/           # DB / 鉴权 / Service DI
│   ├── identity/               # user / role / menu
│   ├── content/                # agent / material / content / review / setting
│   ├── auth.py
│   └── health.py
├── extensions/                 # logging / redis / db / minio / route 生命周期
├── middlewares/                # request log / idempotency / exception
└── providers/                  # LLM / 存储 / 爬虫适配器
```

## 4. 分层与依赖方向

```text
HTTP
  ↓
app.api (routers)  ──→  app.schemas
  ↓
app.services (business)
  ↓
app.repositories (data access)
  ↓
app.models / app.db

app.core        ← 所有层可用的原语
app.extensions  ← 基础设施生命周期
app.providers   ← 外部依赖适配器
app.middlewares ← ASGI 横切
```

规则：

- api 不导入 repositories / models / db；只做参数校验、`Depends`、调 service。
- services 不导入 api；业务逻辑只在这里。
- repositories 不导入 services / api；只做数据访问。
- 跨域只能经拥有方 Service 或 Protocol；禁止跨域 Repository / Model。
- 组合根：`app/api/dependencies/services.py`、`app/main.py`、`app/extensions/*` 可以穿透多层做装配。

## 5. 深模块与 seam

### 深模块

| 模块 | 接口 | 隐藏的实现 |
| --- | --- | --- |
| `MenuService` | create / update / delete / get / nav_tree / full_tree | ancestors 维护、移动防环、O(n) 建树、缓存失效 |
| `ContentService` | generate / get_detail / list_versions / retain / paginate | 状态机、生成次数、prompt 快照、后台任务提交 |
| `AuthService` | login / refresh / logout | 密码校验、JWT 签发、会话白名单、刷新轮换 |
| `core.hierarchy` | build_forest / prune / forest_to_dict | 泛型树构建、O(n) 挂载 |
| `core.tasks.task_store` | submit_task / get_task | Redis 状态机、后台协程、DB session 生命周期 |

### Seam（可替换点）

| Seam | 接口 | 现有 adapter | 未来 adapter |
| --- | --- | --- | --- |
| Provider | `LLMProvider` / `StorageProvider` / `CrawlerProvider` Protocol | qwen / minio / http / mock | 其他供应商 |
| TaskStore | submit_task / get_task | Redis + asyncio | ARQ / Celery |
| DB Session | get_session | SQLAlchemy async | 测试内存库 / 其他驱动 |
| Redis | get_redis | redis.asyncio | 测试 fakeredis |
| Auth | require_permission / get_current_user | JWT + Redis 白名单 | SSO / OAuth（未来） |
| Idempotency | IdempotencyMiddleware / require_idempotency_key | Redis SETNX | 其他存储 |

### 合法浅模块

`UserService` / `RoleService` / `AgentService` / `SettingService` 等 CRUD 服务保持薄；不要为“深”而堆逻辑。

## 6. 关键流程

### 登录

Router → `AuthService.login` → `UserRepository` 校验用户与密码 → 签发 access/refresh → 写 Redis 会话白名单 → 返回令牌对。

### 鉴权

`RequestMiddleware` 注入 Trace ID → `get_current_user` 解析 Bearer → 校验 JWT → 校验 Redis 会话白名单 → 载入 User → 聚合权限码（Redis cache-aside）→ `require_permission` 校验。

### 内容生成

Router → `ContentService.generate`（同步段：校验生成次数、+1、置 generating、快照参数、组装 prompt）→ `submit_task` → 后台协程（自建 Session + Provider）→ 写 `ContentVersion` → 置 generated；失败置 generate_failed。

### 会话撤销

登出与刷新轮换按用户会话索引删除 access + refresh；禁用/删除用户调用全量撤销，清空该用户全部会话。重新启用用户不会恢复旧会话。

## 7. 应用生命周期

- `create_app()` 构建应用；`lifespan` 顺序执行 startup hooks，逆序执行 shutdown hooks。
- 扩展 `init_app(app)` 把启停函数追加到 `app.state.startup_hooks` / `shutdown_hooks`。
- 启停顺序：logging → DB → Redis → MinIO → 权限审计 → routes；关闭逆序。
- 扩展启用由 `{module_name}_enabled` 配置控制。

## 8. 后台任务

- `TaskStore` 用 Redis 保存 `pending → running → completed / failed` 状态，`submit_task` 返回 `task_id`。
- 后台协程必须自建 DB Session 与 Provider，不得捕获请求作用域对象。
- `TaskStore` 是 seam；未来队列 adapter 必须保持 `submit_task` / `get_task` 接口不变。

## 9. 可观测性

- 日志格式由 `LOG_FORMAT` 配置（`json` 默认 / `text`），JSON 结构化日志 + Trace ID（contextvars）；请求日志由 `RequestMiddleware` 写入。
- 日志禁止包含密码、令牌、密钥与完整 PII。
- 本轮不接 OpenTelemetry / Prometheus；在 Platform 预留 `observability` 扩展入口。
- 未来接入时，业务代码不得直接 import OTel SDK，必须经 Platform seam。

## 10. 测试策略

- 首选最高 seam：HTTP API（httpx `ASGITransport`）。
- 集成测试使用真实 Redis + 测试 DB；Provider 用 `dependency_overrides` 替换 Mock；不得调用真实外部服务。
- 纯逻辑（prompt builder、hierarchy、登录策略）做单元测试。
- 认证补强测试：登录成功/失败、禁用用户、限流、锁定、刷新轮换、登出失效。
- 现有 `conftest.py` 只挂路由、跳过 Redis/DB；需新增 DB/Redis fixture（认证 spec 的首批 ticket）。

## 11. 深化机会（本轮不重构）

- 认证限流/锁定策略：限流已抽成 `LoginGuard`（深模块 + 纯阈值函数）；失败锁定在 ticket 03 扩展同一模块。
- `TaskStore` 保持 seam，不急于引入队列。
- CRUD service 不强求深模块。
- `content_repo.py` 在聚合边界稳定前不拆分。

## 12. 已知缺口

| 缺口 | 目标 | 处理 |
| --- | --- | --- |
| `retained` 非终态；评审未限制从 `generated` 发起 | 严格状态机 | 内容域后续里程碑 |
| OTel / Prometheus 未接入 | 经 Platform observability seam | 独立里程碑 |
| 内容写接口未强制幂等 | 启用 `require_idempotency_key` | 已登记，待确认 |

## 13. 决策记录

- ADR-0001 单一账号模型
- ADR-0002 权限码归口页面菜单与按钮节点
- ADR-0003 JWT + Redis 会话白名单
- ADR-0004 Provider 运行时切换
