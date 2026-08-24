"""MinIO 对象存储 Provider（StorageProvider 实现）。

封装素材上传、导出文件读写、配图存储等对象存储调用。
连接由 extensions.minio_ext 管理，本 Provider 只做业务语义封装。
全程使用 miniopy-async 原生异步 API，不阻塞事件循环。
"""

from __future__ import annotations

import io
from typing import Any

from app.core.config import settings
from app.core.exceptions import StorageException


def _minio_error() -> type[Exception]:
    """惰性解析 MinIO 基础异常类，避免在未安装依赖时的强导入。"""
    from miniopy_async.error import MinioException

    return MinioException


class MinioStorageProvider:
    """基于 MinIO 的对象存储实现。"""

    def __init__(self, bucket: str, presign_expire_seconds: int) -> None:
        self._bucket = bucket
        self._presign_expire_seconds = presign_expire_seconds

    @staticmethod
    def _client() -> Any:
        """惰性导入 MinIO 客户端，避免 provider → extensions 循环依赖。"""
        from app.extensions.minio_ext import get_minio

        return get_minio()

    async def upload(self, key: str, data: bytes, content_type: str) -> str:
        """上传字节流，返回对象 key。"""
        client = self._client()
        try:
            await client.put_object(
                bucket_name=self._bucket,
                object_name=key,
                data=io.BytesIO(data),
                length=len(data),
                content_type=content_type,
            )
        except _minio_error() as exc:
            raise StorageException(f"对象上传失败：{exc}") from exc
        return key

    async def download(self, key: str) -> bytes:
        """下载对象字节流。"""
        client = self._client()
        try:
            response = await client.get_object(self._bucket, key)
            try:
                return await response.read()
            finally:
                response.close()
                await response.release()
        except _minio_error() as exc:
            raise StorageException(f"对象下载失败：{exc}") from exc

    async def presigned_url(self, key: str, expires: int | None = None) -> str:
        """生成对象的预签名下载 URL。"""
        from datetime import timedelta

        client = self._client()
        seconds = expires if expires is not None else self._presign_expire_seconds
        try:
            return await client.presigned_get_object(
                self._bucket,
                key,
                expires=timedelta(seconds=seconds),
            )
        except _minio_error() as exc:
            raise StorageException(f"生成预签名 URL 失败：{exc}") from exc

    async def aclose(self) -> None:
        """连接由 minio_ext 统一管理，此处无需释放。"""
        return None


class MockStorageProvider:
    """内存 Mock 存储实现，用于本地或测试环境。"""

    def __init__(self) -> None:
        self._store: dict[str, bytes] = {}

    async def upload(self, key: str, data: bytes, content_type: str) -> str:
        self._store[key] = data
        return key

    async def download(self, key: str) -> bytes:
        if key not in self._store:
            raise StorageException(f"对象不存在：{key}")
        return self._store[key]

    async def presigned_url(self, key: str, expires: int | None = None) -> str:
        return f"mock://{key}"

    async def aclose(self) -> None:
        return None


def build_storage_provider() -> MinioStorageProvider | MockStorageProvider:
    """根据配置构建存储 Provider（minio_ext 关闭时回退 Mock）。"""
    if settings.minio_ext_enabled:
        return MinioStorageProvider(
            bucket=settings.minio_bucket,
            presign_expire_seconds=settings.minio_presign_expire_seconds,
        )
    return MockStorageProvider()
