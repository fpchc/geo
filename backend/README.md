# Enterprise Backend

企业生产级 FastAPI 后端骨架：Clean Architecture 分层、SQLAlchemy 2.0 全异步、Alembic 迁移、RBAC 鉴权、幂等中间件、全链路 Trace ID 与 JSON / 文本可配置日志。

## 技术栈

- Python 3.12，`uv` 管理依赖
- FastAPI + SQLAlchemy 2.0 (async) + aiomysql + Alembic
- Redis（幂等去重）
- Ruff（Lint + Format）+ Mypy（strict）+ pre-commit
- pytest + pytest-asyncio

## 快速开始

```bash
uv venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
uv pip install -r pyproject.toml --extra dev
cp .env.example .env
docker compose up -d redis mysql
alembic revision --autogenerate -m "init"
alembic upgrade head
uvicorn app.main:app --reload --port 7001
```

后端端口由 `.env` 的 `APP_PORT` 控制（默认 `7001`），容器启动同样读取该变量。

一键容器化：`docker compose up --build`

## 分层职责

| 层 | 目录 | 职责 |
| --- | --- | --- |
| API | `app/api/v1/` | 参数校验 + `Depends()` 注入 + 调 service |
| 依赖 | `app/api/dependencies/` | DB Session / 鉴权 / 当前用户 |
| Service | `app/services/` | 业务逻辑 |
| Model | `app/models/` | ORM 与 DB 交互 |

## 项目文档

- 常驻规则：`AGENTS.md`（经 `CLAUDE.md` 的 `@AGENTS.md` 引入）
- 目标架构：`docs/architecture/target.md`
- 实现快照：`docs/architecture/implementation.md`
- 模块索引：`docs/architecture/module-map.md`
- 工程约束：`docs/constraints/README.md`
- 领域词汇：`CONTEXT.md`
- Specs / Tickets：`docs/specs/`、`docs/tickets/`
- 架构决策：`docs/adr/`

功能完成后按 `docs/constraints/update-memory.md` 维护实现快照与模块索引。
