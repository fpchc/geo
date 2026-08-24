# syntax=docker/dockerfile:1

# ---- Stage 1: builder ----
FROM python:3.12-slim AS builder

# uv：极速依赖安装器
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv

WORKDIR /build

# 先只拷贝依赖声明，最大化利用构建缓存
COPY pyproject.toml ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv venv /opt/venv && \
    uv pip install --python /opt/venv/bin/python -r pyproject.toml

# ---- Stage 2: runtime ----
FROM python:3.12-slim AS runtime

# 非 root 运行
RUN groupadd --system app && useradd --system --gid app --create-home app

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY --chown=app:app app ./app
COPY --chown=app:app alembic.ini ./alembic.ini
COPY --chown=app:app migrations ./migrations

USER app

EXPOSE 8000

# 生产以 uvicorn 多 worker 启动；如需多进程可外挂 gunicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
