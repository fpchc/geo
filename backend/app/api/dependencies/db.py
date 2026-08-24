"""全局 DB 依赖：提供请求作用域内的 AsyncSession。"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session


async def get_db() -> AsyncGenerator[AsyncSession]:
    """FastAPI 依赖：注入事务边界内的 AsyncSession。"""
    async for session in get_session():
        yield session
