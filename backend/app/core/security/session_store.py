"""基于 Redis 的会话白名单存储。

Key 设计：
- session:{user_id}:{access_jti}  → 登录元数据(JSON)，TTL = access 有效期
- refresh:{refresh_jti}           → "{user_id}:{access_jti}"，TTL = refresh 有效期

鉴权时校验 session key 是否存在（白名单）；logout 删除即时失效；
refresh 轮换时删旧 refresh key、建新 session + refresh。
"""

from __future__ import annotations

import json
from typing import Any

from app.core.config import settings

# 说明：get_redis 在各函数内惰性导入，避免
# session_store → extensions → db_ext → app.core.security 的模块级循环导入。


def _session_key(user_id: int, access_jti: str) -> str:
    return f"{settings.session_key_prefix}:{user_id}:{access_jti}"


def _refresh_key(refresh_jti: str) -> str:
    return f"{settings.refresh_key_prefix}:{refresh_jti}"


async def create_session(
    user_id: int,
    access_jti: str,
    refresh_jti: str,
    *,
    meta: dict[str, Any] | None = None,
) -> None:
    """写入 access 会话白名单与 refresh 记录。"""
    from app.extensions.redis_ext import get_redis

    redis = get_redis()
    access_ttl = settings.jwt_access_token_expire_minutes * 60
    refresh_ttl = settings.jwt_refresh_token_expire_days * 86400

    payload = json.dumps(meta or {}, ensure_ascii=False)
    await redis.set(_session_key(user_id, access_jti), payload, ex=access_ttl)
    await redis.set(
        _refresh_key(refresh_jti),
        f"{user_id}:{access_jti}",
        ex=refresh_ttl,
    )


async def is_session_active(user_id: int, access_jti: str) -> bool:
    """鉴权校验：access 会话是否在白名单内。"""
    from app.extensions.redis_ext import get_redis

    redis = get_redis()
    return bool(await redis.exists(_session_key(user_id, access_jti)))


async def resolve_refresh(refresh_jti: str) -> tuple[int, str] | None:
    """返回 refresh 关联的 (user_id, 旧 access_jti)；不存在返回 None。"""
    from app.extensions.redis_ext import get_redis

    redis = get_redis()
    raw = await redis.get(_refresh_key(refresh_jti))
    if raw is None:
        return None
    value = raw.decode() if isinstance(raw, bytes) else str(raw)
    user_str, _, access_jti = value.partition(":")
    try:
        return int(user_str), access_jti
    except ValueError:
        return None


async def revoke_session(user_id: int, access_jti: str, refresh_jti: str | None = None) -> None:
    """登出：删除 access 会话与（可选）refresh 记录。"""
    from app.extensions.redis_ext import get_redis

    redis = get_redis()
    await redis.delete(_session_key(user_id, access_jti))
    if refresh_jti is not None:
        await redis.delete(_refresh_key(refresh_jti))


async def revoke_refresh(refresh_jti: str) -> None:
    """删除单个 refresh 记录（用于轮换时废弃旧 token）。"""
    from app.extensions.redis_ext import get_redis

    redis = get_redis()
    await redis.delete(_refresh_key(refresh_jti))


__all__ = [
    "create_session",
    "is_session_active",
    "resolve_refresh",
    "revoke_refresh",
    "revoke_session",
]
