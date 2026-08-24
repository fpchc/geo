# 项目常驻规范 (Always-on)

> 每次对话自动加载。详细实现规范按需通过斜杠命令加载。

---

## 1. 任务触发映射

| 任务 | 命令 |
| --- | --- |
| 初始化项目骨架 / 生成基础工程结构 | `/scaffold` |
| 新增接口 / 修改 method、path、decorator、权限声明 | `/endpoint-permission` |
| 新增或修改有副作用的写接口（POST/PUT/PATCH/DELETE） | `/endpoint-idempotency` |
| 新增/修改菜单节点 / 调整菜单树 / 改菜单表结构 | `/menu-seed` |
| 骨架生成完毕 / 每次功能完成 | `/update-memory` |

---

## 2. 语言与类型

* Python `>= 3.12`，使用新式类型注解：`X | None`、`list[T]`、`dict[K, V]`，可用 `type` 语句定义别名。
* 全部函数、方法签名必须有完整类型注解，异步返回类型（`AsyncGenerator` / `AsyncIterator`）需明确。
* 抽象接口使用 `abc.ABC` 或 `typing.Protocol`，保证 `mypy` 可静态检查。

## 3. 异步与并发

* 严禁在 `async` 路由 / 扩展中写阻塞式同步 I/O；必须调用同步库时用 `anyio.to_thread.run_sync` 包装。
* Provider / 外部 HTTP 调用统一走 `httpx.AsyncClient`。

## 4. 统一响应与异常

* 响应体固定结构：`{"code": <int>, "message": <str>, "data": <any>}`。
* 所有异常经 `ExceptionMiddleware` 转成上述结构；业务异常继承自 `app/core/exceptions.py` 基类。
* 错误码枚举集中登记在 `app/core/exceptions.py`，禁止散落硬编码。
* 列表分页：入参 `page`（默认 1）+ `page_size`（默认 20，上限 100），可选 `sort_by` + `sort_order`（`asc`/`desc`，默认 `desc`）；响应 `data` 含 `items / total / page / page_size / total_pages`。

## 5. 配置驱动

* 全局配置走 `pydantic-settings`；扩展启用开关命名 `{module_name}_enabled: bool`。
* 提交仓库只允许 `.env.example`，禁止提交 `.env`。
* 代码中禁止硬编码 URL / 密钥 / 阈值。

## 6. 目录结构

```text
app/
├── main.py               # FastAPI 入口 + lifespan
├── core/                 # 按职责分子包，每个子包 __init__.py 重导出公共符号
│   ├── config/           #   config.py / loader.py / openapi.py（配置与应用装配）
│   ├── context/          #   context.py（Trace ID + 当前用户）
│   ├── exceptions/       #   exceptions.py（异常基类 + 错误码枚举）
│   ├── security/         #   security.py / permission_scanner.py（鉴权 + 权限码一致性审计；权限落库靠菜单按钮 perm_code）
│   ├── providers/        #   provider_registry.py（Provider 依赖注入注册中心）
│   └── hierarchy/        #   hierarchy.py（通用泛型层级树构建）
├── db/                   # session / base
├── models/               # SQLAlchemy models (含 rbac)
├── extensions/           # logging / redis / db / route
├── middlewares/          # request_log / idempotency / exception_handler
├── providers/            # base / http_provider
├── api/v1/               # 业务路由（统一 /api/v1/ 前缀）：health / auth / user / role / menu
├── api/dependencies/     # 全局复用依赖（DB Session / 鉴权 / 当前用户）
├── repositories/         # 数据持久层（泛型 BaseRepository + user/role/menu repo）
├── services/             # 业务逻辑层（user/role/menu/auth service）
└── schemas/              # response / pagination / 各业务 IO Schema
```

* 路由只做参数校验 + `Depends()` 注入 + 调 service；service 承载业务逻辑，经 repository 访问数据；repository 与 db 交互（不在 service 直接写 SQLAlchemy 查询）。
* 路由统一挂 `/api/v1/` 前缀；全局依赖统一放 `app/api/dependencies/`，路由层只通过 `Depends()` 获取。
* `core/` 按职责分子包：外部统一从**包级**导入（如 `from app.core.config import settings`、`from app.core.security import require_permission`），包内实现文件不对外直接引用；包内跨模块引用走具体模块路径（如 `from app.core.security.security import declared_permission_codes`）以避免循环导入。

## 7. 数据库与 ORM

* 严格使用 `SQLAlchemy 2.0+` 异步模式（`sqlalchemy.ext.asyncio` + `AsyncSession`），禁止同步 `Session` / `engine`。
* Schema 变更统一由 `Alembic` 驱动，禁止手动直连 DB 改表。

## 8. 代码质量

* `ruff` 作为 Linter + Formatter，配置在 `pyproject.toml`。
* 提交前跑 `.pre-commit-config.yaml`：`ruff format` + `ruff check` + `mypy`。
* 严禁 `...` / `pass` / 占位注释提交代码。

## 9. 新增接口必做（always-on，不可跳过）

新增或修改任意 `/api/v1/*` 路由时，无需用户提醒，自动加载并遵守：

* `/endpoint-permission`：权限码三段式字面量、`summary` 中文、`tags` 为 `{module}:{resource}`、完整响应注解。
* `/endpoint-idempotency`：写接口（POST/PUT/PATCH/DELETE）按其"强制幂等清单"判断是否加 `Depends(require_idempotency_key)`。

细节以两份命令文件为唯一权威源，本节仅作触发提示。

## 10. 行为约束

* 未收到明确的"写代码 / 修改代码 / 生成代码"指令，严禁输出任何代码改动。
* 非骨架任务修改前必须先与用户确认方案。
* 骨架生成时必须输出完整代码，禁止省略。
* 禁止读取：`gemini.md`、`venv/`、`node_modules/`、`__pycache__` 等构建产物；`.env`、`*.pem`、`*.key` 等敏感文件。

## 11. 项目记忆层（跨会话节省 token）

* **骨架生成完毕** / **每次功能完成**：运行 `/update-memory` 更新 `.ai/ARCHITECTURE.md` 和 `.ai/MODULE_MAP.md`。
* **新会话开始**：优先读 `.ai/ARCHITECTURE.md`，再按需读具体文件，禁止直接扫描整个 `app/`。
* 格式规范与写入约束详见 `/update-memory`。


请根据项目根目录的 `claude.md` 为我初始化一个企业生产环境级别的 Python 后端项目骨架。

**核心技术栈与环境要求：**
1. **语言版本**：Python 3.12。请在代码生成中充分利用 3.12 的新特性（例如：使用新的 `type` 关键字定义类型别名、充分应用泛型语法改进、使用现代的 `asyncio` 写法）。
2. **Web 与 DB**：FastAPI + SQLAlchemy 2.0 (全异步模式) + Alembic。
3. **依赖与工具**：使用 uv 管理依赖；使用 Ruff 进行代码 Lint 和格式化（替代 Flake8/Black/Isort）；使用 Mypy 进行严格类型检查。

**企业级架构规范：**
1. **架构模式**：采用整洁架构（Clean Architecture）或领域驱动设计（DDD）分层。必须将路由层（API）、业务逻辑层（Services）和数据持久层（Repositories）严格解耦。
2. **可观测性 (Observability)**：预留结构化日志（JSON Logging）和 OpenTelemetry/Prometheus 链路追踪的初始化入口。
3. **配置管理**：使用 `pydantic-settings` 统一管理多环境（Dev/Staging/Prod）的配置。

**请执行以下动作：**
1. 输出完整的、模块化的目录树结构（需附带各目录职责的简短注释）。
2. 提供企业级的 `pyproject.toml` 核心依赖与 Ruff/Mypy 配置。
3. 提供核心的入口文件（如 `src/main.py`）和依赖注入配置示例。
4. **最重要的一步**：按照 `init-skeleton` 技能的要求，生成 `.ai/ARCHITECTURE.md` 和 `.ai/MODULE_MAP.md` 的初稿内容，建立项目的初始记忆库。