"""密码哈希与校验（bcrypt）。

bcrypt 为 CPU 密集同步操作，在异步上下文中经 anyio.to_thread 包装，避免阻塞事件循环。
bcrypt 仅取密码前 72 字节，超长部分会被忽略——此处显式截断以保证行为可预期。
"""

from __future__ import annotations

import anyio
import bcrypt

_BCRYPT_MAX_BYTES = 72


def _truncate(password: str) -> bytes:
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def _hash_sync(password: str) -> str:
    return bcrypt.hashpw(_truncate(password), bcrypt.gensalt()).decode("utf-8")


def _verify_sync(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_truncate(password), hashed.encode("utf-8"))
    except ValueError:
        # 存储的哈希格式非法时视为校验失败，而非抛错
        return False


async def hash_password(password: str) -> str:
    """异步生成 bcrypt 密码哈希。"""
    return await anyio.to_thread.run_sync(_hash_sync, password)


async def verify_password(password: str, hashed: str) -> bool:
    """异步校验明文密码与哈希是否匹配。"""
    return await anyio.to_thread.run_sync(_verify_sync, password, hashed)


__all__ = ["hash_password", "verify_password"]
