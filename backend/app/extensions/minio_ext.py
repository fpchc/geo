"""MinIO 扩展：异步对象存储客户端 + lifespan 启停。

- 仅负责客户端连接生命周期（惰性单例、建桶探活、优雅关闭），
  业务侧的上传/下载/预签名统一走 providers.StorageProvider（不直接用本客户端）。
- 使用 miniopy-async 原生异步 SDK，避免阻塞事件循环。
"""

from __future__ import annotations

import logging

from typing import TYPE_CHECKING

from fastapi import FastAPI

from app.core.config import settings

if TYPE_CHECKING:
    from miniopy_async import Minio

logger = logging.getLogger(__name__)

_minio_client: Minio | None = None


def get_minio() -> Minio:
    """返回全局 MinIO 客户端；未初始化则惰性创建。"""
    global _minio_client
    if _minio_client is None:
        from miniopy_async import Minio

        _minio_client = Minio(
            endpoint=settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
    return _minio_client


async def startup(app: FastAPI) -> None:
    """探活连接并确保默认桶存在。"""
    client = get_minio()
    exists = await client.bucket_exists(settings.minio_bucket)
    if not exists:
        await client.make_bucket(settings.minio_bucket)
        logger.info("minio bucket created: %s", settings.minio_bucket)
    logger.info("minio connected: %s", settings.minio_endpoint)


async def shutdown(app: FastAPI) -> None:
    """释放 MinIO 客户端引用。

    miniopy-async 基于 aiohttp，会话随进程回收；此处仅清空单例引用。
    """
    global _minio_client
    _minio_client = None
    logger.info("minio client released")


def init_app(app: FastAPI) -> None:
    """注册 lifespan 钩子（由 main.lifespan 统一调度）。"""
    app.state.startup_hooks.append(startup)
    app.state.shutdown_hooks.append(shutdown)
