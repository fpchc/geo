"""数据库扩展：SQLAlchemy async 连接池 lifespan 启停 + 启动权限审计。

- startup：初始化 engine，探活连接，审计代码权限码与菜单按钮的一致性（只读）。
- shutdown：释放连接池。
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from sqlalchemy import text

from app.core.security import audit_permission_codes
from app.db.session import dispose_engine, get_sessionmaker, init_engine

logger = logging.getLogger(__name__)


async def startup(app: FastAPI) -> None:
    """建立引擎、探活，并审计权限码一致性。"""
    init_engine()
    factory = get_sessionmaker()
    async with factory() as session:
        await session.execute(text("SELECT 1"))
        await audit_permission_codes(session)
    logger.info("database engine initialized")


async def shutdown(app: FastAPI) -> None:
    """释放数据库连接池。"""
    await dispose_engine()
    logger.info("database engine disposed")


def init_app(app: FastAPI) -> None:
    """注册 lifespan 钩子（由 main.lifespan 统一调度）。"""
    app.state.startup_hooks.append(startup)
    app.state.shutdown_hooks.append(shutdown)
