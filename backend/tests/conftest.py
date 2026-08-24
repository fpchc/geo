"""pytest 异步测试脚手架。

提供：
- app fixture：仅加载路由扩展、跳过 redis/db 连接，避免测试依赖外部服务。
- client fixture：基于 httpx.AsyncClient + ASGITransport 的异步测试客户端。
- 演示如何用 app.dependency_overrides Mock Provider（见 test_providers.py）。
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api import api_router
from app.core.config import settings


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
