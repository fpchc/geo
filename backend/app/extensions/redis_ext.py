"""Redis 扩展：异步客户端 + lifespan 启停。

提供全局 async Redis 客户端，供幂等中间件与就绪探针使用。
"""

from __future__ import annotations

import logging

import redis.asyncio as aioredis
from fastapi import FastAPI

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis_client: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis:
    """返回全局 Redis 客户端；未初始化则惰性创建。"""
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=False,
        )
    return _redis_client


async def startup(app: FastAPI) -> None:
    """建立连接并 ping 探活。"""
    client = get_redis()
    await client.ping()
    logger.info("redis connected: %s", settings.redis_url)


async def shutdown(app: FastAPI) -> None:
    """优雅关闭 Redis 连接池。"""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
        logger.info("redis connection closed")


def init_app(app: FastAPI) -> None:
    """注册 lifespan 钩子（由 main.lifespan 统一调度）。"""
    app.state.startup_hooks.append(startup)
    app.state.shutdown_hooks.append(shutdown)
