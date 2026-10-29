# 后端约束 (Backend Constraints)

> 约束分两类：**CI 硬约束**（机器检查）与 **Review 约束**（人工评审）。
> 违反硬约束不得合并；违反 Review 约束需在 PR 中说明理由。
> §0 是最高优先级边界约束，违反即停止。

## 0. 工作边界（最高优先级）

- 边界 = 本项目工作根 `D:\vibecoding\geo\backend`；会话从其他目录启动时也不得扩大。
- 文件读取、创建、修改、删除、移动与有副作用的命令，解析后的路径必须落在边界内。
- 禁止修改 `../frontend/`、`../.github/`、仓库根文件等边界外内容；禁止用 `..`、绝对路径或符号链接绕出。
- 禁止从 backend 执行跨目录的 `git add` / `git commit` / `git mv`、根级依赖安装或全仓格式化。
- 需要跨边界读写时，先说明目标路径与理由并取得显式授权；授权仅限该次操作。

## 1. 依赖方向

### 1.1 分层

- api → services → repositories → models / db。
- api 禁止导入 repositories / models / db。
- services 禁止导入 api。
- repositories 禁止导入 services / api。
- models 禁止导入 services / repositories / api。
- schemas 禁止导入 repositories / db / services。

### 1.2 领域

- 三个域：Identity / Content / Platform。
- 跨域只经拥有方 Service 或 Protocol；禁止跨域 Repository / Model。
- Platform 不反向依赖 Identity / Content 的业务模块；`app/main.py`、`app/core/config/loader.py`、`app/api/dependencies/*`、`app/extensions/*` 作为组合根例外。

### 1.3 组合根

- 只有 `app/main.py`、`app/core/config/loader.py`、`app/api/dependencies/*`、`app/extensions/*` 可以跨层装配。
- 路由通过 `Depends()` 获取 service；禁止在路由内 `new` service / repository。

## 2. 接口职责

### 类型系统

- Python 3.12；所有函数/方法完整类型注解，异步返回类型明确。
- 使用新式注解：`X | None`、`list[T]`、`dict[K, V]`；可用 `type` 语句定义别名。
- 抽象接口使用 `abc.ABC` 或 `typing.Protocol`；`mypy --strict` 必须通过。
- 禁止提交 `...` / `pass` / 占位注释。

### Router

- 只做参数校验、`Depends()` 注入、调用 service、返回 `BizResponse[T]`。
- 不写 SQL、不写业务分支、不直接操作 ORM。
- `summary` 使用中文；`tags` 为 `{module}:{resource}`。
- 每个受保护路由必须声明 `require_permission(code)`。

### Service

- 承载业务规则与事务边界；返回 schema / 领域结果。
- 可调用同域 service / repository；不得导入 FastAPI `Request` / `Response`。
- 不直接写 SQLAlchemy 查询；查询归 repository。

### Repository

- 每个聚合根一个 repository；方法表达查询语义。
- 不做业务决策；不跨聚合写；不导入 service / api。

### Model / Schema

- Model 只做持久化映射；不写查询、不写业务逻辑。
- Schema 只做 I/O 契约；不访问 DB、不写业务逻辑。

### Provider

- Protocol 定义在 `app/core/providers` 或 `app/providers/base.py`。
- 业务层依赖 Protocol，不依赖具体 adapter；adapter 生命周期由 Provider 自身或扩展管理。

## 3. 异步与并发

- async 路径禁止阻塞式同步 I/O。
- 必须使用同步库时，用 `anyio.to_thread.run_sync` 包装（bcrypt、pdf/docx 解析等）。
- 外部 HTTP 统一走 `httpx.AsyncClient`，必须设置 timeout。
- 后台任务必须自建 DB Session 与 Provider，不得捕获请求作用域对象。

## 4. 响应与异常

- 响应体固定 `{"code", "message", "data"}`，统一用 `BizResponse`。
- 业务异常继承 `AppException`；错误码集中在 `app/core/exceptions/` 的 `ErrorCode`。
- 禁止散落硬编码错误码；HTTP 状态映射集中在 `ExceptionMiddleware`。
- 分页入参 `page` / `page_size` / `sort_by` / `sort_order`；响应含 `items / total / page / page_size / total_pages`。

## 5. 配置

- 统一使用 `pydantic-settings`；多环境配置由环境变量驱动。
- 只提交 `.env.example`，禁止提交 `.env`。
- 扩展启用开关命名 `{module_name}_enabled`。
- 禁止硬编码 URL / 密钥 / 阈值；新增配置必须同步 `.env.example`。

## 6. 认证、权限与幂等

- 权限码格式 `{module}:{resource}:{action}`；声明在 `require_permission`。
- 权限码必须同时存在于菜单种子（页面菜单或按钮节点），启动审计会比对。
- 写接口（POST/PUT/PATCH/DELETE）有副作用时，按 `docs/constraints/endpoint-idempotency.md` 加 `Depends(require_idempotency_key)`；认证端点（login / refresh / logout）明确豁免。
- 幂等 Key 格式 `X-Idempotency-Key`，与 `IdempotencyMiddleware` 协同。
- 角色授权或菜单 `perm_code` 变更后必须失效权限缓存。
- 禁用用户必须撤销其全部会话。
- 内容写接口（generate/regenerate/material/review）当前未强制幂等，已登记为已知缺口；启用前不得视为满足本约束。

## 7. 数据库与迁移

- 只使用 SQLAlchemy 2.0 async；禁止同步 `Session` / `engine`。
- Schema 变更只走 Alembic；禁止手工改表。
- 生产迁移采用 forward 迁移；可回滚的迁移应提供 `downgrade`。
- 通用时间戳用 `TimestampMixin`；领域时间字段显式声明。
- 命名约定由 `app/db/base.py` 统一。

## 8. 可观测性

- 日志格式由 `LOG_FORMAT` 配置（`json` 默认 / `text`，`txt` 等价 `text`），禁止在代码中写死 formatter；每个请求带 Trace ID。
- 日志禁止输出密码、令牌、密钥与完整 PII。
- 外部调用记录耗时与结果，不记录敏感 payload。
- OTel / Prometheus 只能经 Platform observability seam 接入；业务代码不得直接 import SDK。

## 9. 测试

- 测试外部行为，不测实现细节；优先使用最高 seam。
- 流程类改动优先写 HTTP API 集成测试。
- 纯逻辑（prompt builder、hierarchy、登录策略）写单元测试。
- 测试不得调用真实外部服务；Provider 用 `dependency_overrides` 替换。
- 集成测试使用真实 Redis + 测试 DB；每个测试清理状态。
- 认证相关改动至少覆盖：成功、密码错误、禁用用户、限流、锁定、刷新轮换、登出失效。
- 预存失败测试必须修复或隔离并登记 issue。

## 10. 性能

- 列表接口必须分页；`page_size` 默认 20、上限 100；禁止无界列表。
- 避免 N+1；优先 `selectinload` 或显式 join。
- 树构建一次查库 + O(n) 内存建树；禁止逐节点递归查询。
- 权限码走 Redis 缓存；角色/菜单变更时精确失效。
- 外部调用必须设置超时；禁止无界重试。

## 11. CI 门禁

后端 CI job（已加入 `.github/workflows/ci.yml`）：

```bash
uv sync --frozen
uv run ruff format --check .
uv run ruff check .
uv run mypy app
uv run lint-imports
uv run pytest
```

- pre-commit 已配置 `ruff format` + `ruff check` + `mypy`。
- import-linter 契约（已配置）：以 direct-only 方式固化第 1 节的依赖方向与领域边界。
- 所有门禁必须通过才能合并。

## 12. 约束执行矩阵

| 约束 | 执行方式 |
| --- | --- |
| 分层/领域依赖方向 | import-linter（CI） |
| 类型注解完整性 | mypy strict |
| 格式、lint、isort | ruff |
| 异步阻塞检查 | ruff ASYNC + review |
| 测试通过 | pytest |
| 权限码一致性 | 启动审计 + review |
| 幂等要求 | review + 测试 |
| 迁移规范 | Alembic review |
| 配置/密钥 | review + secret scan（未来） |
| 可观测性规范 | review |
