"""异步数据库会话工厂。

使用 create_async_engine + async_sessionmaker，全程 AsyncSession。
engine/sessionmaker 延迟初始化，由 db_ext 在 lifespan 阶段建立与销毁。
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

_engine: AsyncEngine | None = None
_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def create_engine() -> AsyncEngine:
    """构建异步引擎（连接池参数由配置驱动）。"""
    return create_async_engine(
        settings.database_url,
        echo=settings.db_echo,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_recycle=settings.db_pool_recycle,
        pool_pre_ping=True,
        future=True,
    )


def init_engine() -> None:
    """初始化全局 engine 与 sessionmaker（幂等）。"""
    global _engine, _sessionmaker
    if _engine is None:
        _engine = create_engine()
        _sessionmaker = async_sessionmaker(
            bind=_engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )


async def dispose_engine() -> None:
    """释放连接池，供 lifespan shutdown 调用。"""
    global _engine, _sessionmaker
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _sessionmaker = None


def get_engine() -> AsyncEngine:
    if _engine is None:
        init_engine()
    assert _engine is not None
    return _engine


def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    if _sessionmaker is None:
        init_engine()
    assert _sessionmaker is not None
    return _sessionmaker


async def get_session() -> AsyncGenerator[AsyncSession]:
    """提供一个事务边界内的 AsyncSession。

    正常返回时提交，异常时回滚，最终释放会话。
    """
    factory = get_sessionmaker()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
