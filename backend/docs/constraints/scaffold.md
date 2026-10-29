# 骨架生成提示词 (Scaffold)

> 使用场景：**仅在初始化项目骨架时加载一次**。骨架生成完毕后无需再引用。
> 增量开发规则请参见 `docs/constraints/endpoint-permission.md`、`docs/constraints/endpoint-idempotency.md`。

你现在是一位资深的 Python 后端架构师。请为我从零构建一个企业级 FastAPI 后端项目骨架。

---

## 最高指令：绝对禁止任何代码省略

必须提供完整、可以直接运行的代码。严禁使用 `...`、`pass` 或类似 "# 请在此填写逻辑" 的提示来截断代码。每一个文件的导入 (imports)、类型注解 (Type Hints)、核心逻辑和导出必须 100% 完整写出。

---

## 1. 基础构建与工程化约束

* **Python 版本**：`>= 3.12`，充分利用 3.12 的类型注解语法（如 `type` 语句、`X | None` 替代 `Optional[X]`）。
* **包管理与环境**：必须使用 **`uv`** 构建项目。提供包含完整配置的 `pyproject.toml`，依赖包括：`fastapi`, `uvicorn`, `httpx`, `pydantic-settings`, `redis`, `sqlalchemy[asyncio]`, `aiomysql`, `alembic`, `pytest`, `pytest-asyncio`, `ruff`, `mypy`。
* **代码质量与类型检查**：
  * 使用 `ruff`（Linter & Formatter）替代 flake8/black/isort，配置写在 `pyproject.toml` 中。
  * 必须标注严格的类型提示 (Type Hints)，明确区分 `T | None`、`AsyncGenerator`。所有 Provider 模式必须使用 `mypy` 可检查的 `abc.ABC` 或 `typing.Protocol`。
  * 配置 `.pre-commit-config.yaml`，包含 ruff format + ruff check + mypy，确保提交前自动格式化与检查。
* **环境隔离**：
  * 提交仓库只允许 `.env.example`（仅键名和默认非敏感值）。
  * 必须生成 `.gitignore` 文件，包含：`.env`, `.venv`, `__pycache__`, `.mypy_cache`, `*.pyc`, `logs/`, `.ruff_cache` 等。
* **异步并发与防阻塞**：严禁在异步路由/扩展中写阻塞式同步 I/O。必须基于 `async`/`await`；若不得不调用同步库，必须使用 `anyio.to_thread.run_sync`。
* **全链路日志追踪 (Trace ID)**：必须在 `RequestMiddleware` 中生成 `X-Request-ID` (UUID)，利用 Python 的 `contextvars` 注入全局。该 ID 必须贯穿日志，并自动注入到通过 `httpx` 发起的下游 Provider 请求头中。
* **日志格式 (JSON 结构化)**：
  * 使用 Python 标准 `logging` + 自定义 `JsonFormatter`。
  * 每条日志必须包含字段：`timestamp`, `level`, `trace_id`, `module`, `message`, `extra`。
  * 双输出：`StreamHandler`（console）+ `RotatingFileHandler`（file）。
  * 日志文件路径、轮转大小 (bytes)、保留文件数均由 pydantic-settings 配置驱动。

## 2. 核心架构与加载机制 (严格按照以下逻辑实现)

* **统一配置驱动加载**：使用 `pydantic-settings` 管理全局环境变量。扩展模块的启用状态必须由 Settings 实例的字段控制（字段命名规则：`{module_name}_enabled: bool`），绝不硬编码。
* **统一响应与异常结构**：必须规定标准的业务 JSON 响应体（如 `{ "code": 200, "message": "success", "data": {...} }`），配合自定义 `HTTPException` 处理逻辑。
* **插件化扩展加载 (Extensions Loader) 与 Lifespan**：
  除了同步的 `init_app`，涉及网络连接的插件（如 Redis、数据库）必须提供异步的 `startup`/`shutdown` 钩子，统一接入 FastAPI 的 `lifespan` 异步上下文管理器以确保优雅启停。**核心加载逻辑必须完全按照以下代码实现：**

```python
def initialize_extensions(app: FastAPI):
    from app.core.config import settings
    from app.extensions import logging_ext, redis_ext, db_ext, route_ext

    extensions = [logging_ext, redis_ext, db_ext, route_ext]

    for extension in extensions:
        module_name = extension.__name__.split(".")[-1]
        is_enable = getattr(settings, f"{module_name}_enabled", True)

        if not is_enable:
            logging.info(f"Skipped {module_name}")
            continue

        start_time = time.perf_counter()
        extension.init_app(app)
        end_time = time.perf_counter()
        logging.info(f"Loaded {module_name} ({round((end_time - start_time) * 1000, 2)} ms)")
```

* **中间件加载 (Middlewares Loader)**：
  FastAPI 的 `add_middleware` 是栈式——后添加的在外层先执行。以下顺序确保执行链路为：`RequestMiddleware(生成TraceID/计时) → IdempotencyMiddleware(幂等去重) → ExceptionMiddleware(捕获异常) → Handler`，保证 Trace ID 在最外层生成，异常处理器可使用。**核心加载逻辑必须完全按照以下代码实现：**

```python
def initialize_middlewares(app: FastAPI):
    # 先添加的在内层，后添加的在外层先执行
    # 实际执行链路：RequestMiddleware → IdempotencyMiddleware → ExceptionMiddleware → Handler
    middlewares = [ExceptionMiddleware, IdempotencyMiddleware, RequestMiddleware]
    for middleware in middlewares:
        app.add_middleware(middleware)
```

* **提供者模式与注册中心 (Provider Registry)**：
  在 `app/core/provider_registry.py` 建立注册中心：
  1. 使用 `abc.ABC` 或 `typing.Protocol` 定义基础接口类。
  2. 提供一个基于 `httpx.AsyncClient` 的具体实现类（自动附带 Trace ID）。
  3. 利用 FastAPI 的 `Depends` 动态注入具体服务，演示如何通过配置在运行时切换 Provider。

* **数据库层 (SQLAlchemy Async + aiomysql + Alembic)**：
  * 在 `app/db/session.py` 中创建 `AsyncSession` 工厂，使用 `create_async_engine` + `async_sessionmaker`。
  * 在 `app/db/base.py` 中定义 `DeclarativeBase`。
  * 在 `extensions/db_ext.py` 中管理连接池的 lifespan 启停。
  * 使用 Alembic 管理数据库迁移，`alembic.ini` 和 `migrations/` 放在项目根目录。
  * `DATABASE_URL` 格式为 `mysql+aiomysql://user:pass@host/db`,由 pydantic-settings 配置。

## 3. 认证授权 (RBAC + 菜单)

* **模型层**（放在 `app/models/rbac.py`）：`User`、`Role`、`Permission`、`Menu`，以及 `user_role`、`role_permission`、`role_menu` 三张关联表。
* **鉴权依赖**（放在 `app/core/security.py`）：
  * JWT Bearer 解析，得到当前 `User` 及其权限码集合并注入到 `contextvars`。
  * 提供工厂函数 `require_permission(code: str)`，返回一个 `Depends` 依赖，检查当前用户是否持有该权限码；不通过时抛出 `PermissionDeniedException`。
* **权限码自动注册**（放在 `app/core/permission_scanner.py`）：
  * 应用启动 lifespan 阶段扫描所有已注册路由。
  * 提取路由上通过 `require_permission("xxx")` 声明的权限码，与 `Permission` 表做 upsert（存在则跳过，不存在则新增，包含 `code`、`name`、`module`、`resource`、`action` 字段）。
  * 已从数据库存在但代码中不再出现的权限码只标记 `deprecated=True`，**不物理删除**（避免误删线上分配关系）。
* **权限码命名规则**：详见 [endpoint-permission.md](./endpoint-permission.md)。骨架阶段仅需实现扫描器与依赖，不预置具体业务权限。

## 4. 幂等性 (X-Idempotency-Key + Redis)

* **中间件**（放在 `app/middlewares/idempotency.py`）：
  * 仅对写方法（POST / PUT / PATCH / DELETE）且请求头包含 `X-Idempotency-Key` 时生效。
  * Redis Key 格式：`idem:{method}:{path}:{key}`，TTL 默认 24h（由配置驱动）。
  * 首次请求：处理完成后将响应状态码、响应体、响应头缓存到 Redis 后返回。
  * 重复请求：直接返回缓存内容，并在响应头附加 `X-Idempotent-Replay: true`。
  * 处理中：使用 `SETNX` 占位；若并发第二次进入，直接返回 `409 Conflict`（业务码 `IDEMPOTENT_IN_PROGRESS`）。
* **详细约定**：详见 [endpoint-idempotency.md](./endpoint-idempotency.md)。骨架阶段仅需实现中间件与配置项。

## 5. 路由与通用 Schema

* **路由前缀**：所有业务路由统一前缀 `/api/v1/`。
* **健康检查端点**：
  * `GET /api/v1/health` → 返回 `{"status": "ok", "version": "x.x.x"}`
  * `GET /api/v1/health/ready` → 检测 Redis + DB 连通性，返回各组件状态
* **分页/排序通用 Schema**（在 `schemas/pagination.py`）：

```python
class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    sort_by: str | None = None
    sort_order: Literal["asc", "desc"] = "desc"

class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int
```

## 6. 测试脚手架 (Test Fixtures)

* 在 `tests/conftest.py` 中利用 `pytest.fixture` 构建异步测试客户端 (`httpx.AsyncClient`)。
* 在测试环境下，必须提供如何使用 `app.dependency_overrides` 来 Mock Provider 的完整示例代码。

## 7. 标准职责分离目录结构 (Layered Architecture)

请严格遵守以下目录结构生成文件：

```text
project_root/
├── pyproject.toml
├── .env.example
├── .gitignore
├── .pre-commit-config.yaml
├── Dockerfile
├── docker-compose.yml
├── alembic.ini
├── .github/
│   └── workflows/
│       └── ci.yml
├── migrations/
│   ├── env.py
│   └── versions/
├── CLAUDE.md                   # 只保留 @AGENTS.md
├── AGENTS.md                   # 常驻规则 + 触发映射 + 文档地图
├── CONTEXT.md                  # 领域词汇
├── docs/
│   ├── README.md               # 文档总索引
│   ├── architecture/
│   │   ├── target.md           # 目标架构（占位）
│   │   ├── implementation.md   # 实现快照（表头 + 空表体，占位）
│   │   └── module-map.md       # 模块路径映射（表头 + 空表体，占位）
│   ├── constraints/
│   │   ├── README.md           # 全局工程约束
│   │   ├── endpoint-permission.md
│   │   ├── endpoint-idempotency.md
│   │   ├── menu-seed.md
│   │   ├── scaffold.md
│   │   └── update-memory.md
│   ├── specs/                  # 需求 / 设计 spec
│   ├── tickets/                # 实施 tickets
│   ├── adr/                    # 架构决策记录
│   └── agents/                 # tracker / triage / domain 配置
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 入口，统筹 lifespan
│   ├── core/
│   │   ├── config.py           # pydantic-settings 环境变量
│   │   ├── context.py          # contextvars Trace ID + 当前用户
│   │   ├── loader.py           # extensions 和 middlewares 加载逻辑
│   │   ├── exceptions.py       # 自定义异常与统一响应结构
│   │   ├── security.py         # JWT 解析 + require_permission 依赖
│   │   ├── permission_scanner.py # 启动时扫描路由权限码并 upsert
│   │   └── provider_registry.py# Provider 依赖注入注册中心
│   ├── db/
│   │   ├── session.py          # AsyncSession 工厂 + engine
│   │   └── base.py             # DeclarativeBase
│   ├── extensions/
│   │   ├── __init__.py         # 模块重导出
│   │   ├── base.py             # 扩展基类 (规定 init_app 与 lifespan 接口)
│   │   ├── logging_ext.py      # 日志扩展 (JSON + Trace ID + console/file)
│   │   ├── redis_ext.py        # Redis 扩展 (lifespan 异步启停)
│   │   ├── db_ext.py           # 数据库扩展 (SQLAlchemy async lifespan)
│   │   └── route_ext.py        # 路由扩展 (注册 /api/v1/ 前缀路由)
│   ├── middlewares/
│   │   ├── request_log.py      # RequestMiddleware (Trace ID & 耗时)
│   │   ├── idempotency.py      # IdempotencyMiddleware (X-Idempotency-Key)
│   │   └── exception_handler.py# ExceptionMiddleware (全局 JSON 异常)
│   ├── providers/
│   │   ├── base.py             # abc.ABC 抽象基类
│   │   └── http_provider.py    # httpx.AsyncClient 实现
│   ├── api/
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   └── health.py       # 健康检查端点
│   │   └── dependencies/
│   │       ├── __init__.py     # 全局依赖统一出口
│   │       ├── db.py           # get_db → AsyncSession
│   │       └── auth.py         # get_current_user / require_permission 复用
│   ├── services/
│   ├── schemas/
│   │   ├── response.py         # 统一响应结构 BizResponse
│   │   └── pagination.py       # PaginationParams / PaginatedResponse
│   └── models/
│       └── rbac.py             # User / Role / Permission / Menu
└── tests/
    ├── conftest.py             # pytest-asyncio fixture
    └── test_providers.py       # Mock 测试示例
```

## 8. 容器化与 CI/CD

* **Dockerfile**：多阶段构建，基于 `python:3.12-slim`，使用 `uv` 安装依赖，最终镜像最小化。
* **docker-compose.yml**：包含 `app`、`redis`、`mysql` 三个服务，开发环境一键启动。
* **GitHub Actions** (`.github/workflows/ci.yml`)：
  * Step 1: ruff format --check + ruff check
  * Step 2: mypy
  * Step 3: pytest（启动 MySQL + Redis service containers）

## 9. 输出要求

请严格按顺序，依次输出以下文件的**无省略完整代码**：

`pyproject.toml` → `.gitignore` → `.env.example` → `.pre-commit-config.yaml` → `Dockerfile` → `docker-compose.yml` → `alembic.ini` → `.github/workflows/ci.yml` → `migrations/env.py` → `migrations/versions/.gitkeep` → `CLAUDE.md` → `AGENTS.md` → `CONTEXT.md` → `docs/README.md` → `docs/architecture/target.md`（占位） → `docs/architecture/implementation.md`（空模板） → `docs/architecture/module-map.md`（空模板） → `docs/constraints/README.md` → `docs/constraints/{endpoint-permission,endpoint-idempotency,menu-seed,scaffold,update-memory}.md` → `app/__init__.py` → `app/core/*` → `app/db/*` → `app/models/*` → `app/extensions/*` → `app/middlewares/*` → `app/providers/*` → `app/api/v1/*` → `app/api/dependencies/*` → `app/schemas/*` → `app/main.py` → `tests/*`

`docs/architecture/implementation.md` 与 `docs/architecture/module-map.md` 仅需按 `docs/constraints/update-memory.md` 中约定的表头 + 空表体输出，作为占位；首次功能完成后按该文档填充。禁止生成 `.ai/`、`.scratch/` 或 `.claude/commands/`。

## 10. 行为约束

执行本提示词中规定的项目骨架生成任务时，必须输出完整代码。除此之外的场景（修改已有业务代码、新增功能等），未经确认不得擅自修改或新增代码。
