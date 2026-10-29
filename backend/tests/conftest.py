"""pytest 异步测试脚手架。

提供：
- app / client：轻量路由级 fixture，不连 Redis/DB，适合单元测试。
- integration_app / integration_client：完整 lifespan + 真实 Redis/MySQL，适合集成测试。
- db_session：集成测试用的 AsyncSession。

集成测试前置：
    docker compose up -d mysql redis

环境变量（可选）：
- TEST_DATABASE_URL（默认 mysql+aiomysql://app:app@127.0.0.1:3306/app_test）
- TEST_DB_ROOT_URL（默认 mysql+aiomysql://root:root@127.0.0.1:3306/）
- TEST_REDIS_URL（默认 redis://127.0.0.1:6379/15）
"""

from __future__ import annotations

import os
import re
import socket
from collections.abc import AsyncGenerator
from urllib.parse import urlparse

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.api import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import get_sessionmaker
from app.extensions.redis_ext import get_redis
from app.main import create_app
from app.models import content as _content  # noqa: F401
from app.models import rbac as _rbac  # noqa: F401

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "mysql+aiomysql://app:app@127.0.0.1:3306/app_test",
)
TEST_DB_ROOT_URL = os.getenv(
    "TEST_DB_ROOT_URL",
    "mysql+aiomysql://root:root@127.0.0.1:3306/",
)
TEST_REDIS_URL = os.getenv(
    "TEST_REDIS_URL",
    "redis://127.0.0.1:6379/15",
)


def _require_service(name: str, host: str | None, port: int | None) -> None:
    """集成测试外部服务探活；不可用时跳过并给出启动提示。"""
    if not host or not port:
        pytest.skip(f"{name} 未配置")
    try:
        with socket.create_connection((host, port), timeout=1.0):
            return
    except OSError:
        pytest.skip(
            f"集成测试需要 {name}（{host}:{port}）；先运行 `docker compose up -d mysql redis`"
        )


async def _ensure_test_database(database_url: str) -> None:
    """确保测试数据库存在，并把权限授予测试用户。"""
    url = make_url(database_url)
    database = url.database
    username = url.username
    if not database or not re.fullmatch(r"[A-Za-z0-9_]+", database):
        raise RuntimeError(f"非法测试数据库名：{database!r}")
    if not username or not re.fullmatch(r"[A-Za-z0-9_]+", username):
        raise RuntimeError(f"非法测试数据库用户：{username!r}")

    engine = create_async_engine(TEST_DB_ROOT_URL, isolation_level="AUTOCOMMIT")
    try:
        async with engine.connect() as conn:
            await conn.execute(
                text(
                    f"CREATE DATABASE IF NOT EXISTS `{database}` "
                    "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
            )
            await conn.execute(text(f"GRANT ALL PRIVILEGES ON `{database}`.* TO '{username}'@'%'"))
    finally:
        await engine.dispose()


async def _create_schema(database_url: str) -> None:
    """按 ORM metadata 建表；集成测试不依赖 Alembic 迁移状态。"""
    engine = create_async_engine(database_url)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    finally:
        await engine.dispose()


async def _clear_database(session: AsyncSession) -> None:
    """清空全部业务表；关闭外键检查以简化删除顺序。"""
    await session.execute(text("SET FOREIGN_KEY_CHECKS=0"))
    for table in reversed(Base.metadata.sorted_tables):
        await session.execute(text(f"DELETE FROM `{table.name}`"))
    await session.execute(text("SET FOREIGN_KEY_CHECKS=1"))
    await session.commit()


@pytest.fixture
def app() -> FastAPI:
    """构建最小化测试应用：只挂载路由，不连真实 redis/db。"""
    test_app = FastAPI(title="test-app")
    test_app.include_router(api_router, prefix=settings.api_v1_prefix)
    return test_app


@pytest.fixture
async def client(app: FastAPI) -> AsyncGenerator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


@pytest.fixture
async def integration_app(monkeypatch: pytest.MonkeyPatch) -> AsyncGenerator[FastAPI]:
    """完整应用 lifespan + 真实 Redis/MySQL；每次测试独立启停。"""
    monkeypatch.setattr(settings, "database_url", TEST_DATABASE_URL)
    monkeypatch.setattr(settings, "redis_url", TEST_REDIS_URL)
    monkeypatch.setattr(settings, "minio_ext_enabled", False)
    monkeypatch.setattr(settings, "docs_enabled", False)
    monkeypatch.setattr(settings, "debug", False)

    db_url = make_url(TEST_DATABASE_URL)
    _require_service("MySQL", db_url.host, db_url.port or 3306)
    redis_url = urlparse(TEST_REDIS_URL)
    _require_service("Redis", redis_url.hostname, redis_url.port or 6379)

    await _ensure_test_database(TEST_DATABASE_URL)
    await _create_schema(TEST_DATABASE_URL)

    test_app = create_app()
    async with test_app.router.lifespan_context(test_app):
        yield test_app


@pytest.fixture
async def integration_client(
    integration_app: FastAPI,
) -> AsyncGenerator[AsyncClient]:
    """集成测试客户端；测试前后清理数据库与 Redis。"""
    factory = get_sessionmaker()
    async with factory() as session:
        await _clear_database(session)
    await get_redis().flushdb()

    transport = ASGITransport(app=integration_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

    async with factory() as session:
        await _clear_database(session)
    await get_redis().flushdb()


@pytest.fixture
async def db_session(integration_app: FastAPI) -> AsyncGenerator[AsyncSession]:
    """集成测试用的数据库会话；测试可直接插入数据并 commit。"""
    factory = get_sessionmaker()
    async with factory() as session:
        yield session
