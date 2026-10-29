"""基于 Redis 的会话白名单存储。

Key 设计：
- session:{user_id}:{access_jti}  → 登录元数据(JSON)，TTL = access 有效期
- refresh:{refresh_jti}           → "{user_id}:{access_jti}"，TTL = refresh 有效期
- user_sessions:{user_id}         → Hash: access_jti -> refresh_jti，TTL = refresh 有效期

鉴权时校验 session key 是否存在（白名单）；logout 删除 access + refresh 即时失效；
refresh 轮换时删旧 refresh key、建新 session + refresh；
禁用/删除用户时按 user_sessions 索引撤销全部会话。
"""

from __future__ import annotations

import json
from typing import Any

from app.core.config import settings


def _session_key(user_id: int, access_jti: str) -> str:
    return f"{settings.session_key_prefix}:{user_id}:{access_jti}"


def _refresh_key(refresh_jti: str) -> str:
    return f"{settings.refresh_key_prefix}:{refresh_jti}"


def _user_sessions_key(user_id: int) -> str:
    return f"{settings.user_sessions_key_prefix}:{user_id}"


async def create_session(
    user_id: int,
    access_jti: str,
    refresh_jti: str,
    *,
    meta: dict[str, Any] | None = None,
) -> None:
    """写入 access 会话白名单、refresh 记录与用户会话索引。"""
    from app.extensions.redis_ext import get_redis

    redis = get_redis()
    access_ttl = settings.jwt_access_token_expire_minutes * 60
    refresh_ttl = settings.jwt_refresh_token_expire_days * 86400

    payload = json.dumps({**(meta or {}), "refresh_jti": refresh_jti}, ensure_ascii=False)
    index_key = _user_sessions_key(user_id)
    async with redis.pipeline(transaction=True) as pipe:
        pipe.set(_session_key(user_id, access_jti), payload, ex=access_ttl)
        pipe.set(_refresh_key(refresh_jti), f"{user_id}:{access_jti}", ex=refresh_ttl)
        pipe.hset(index_key, access_jti, refresh_jti)
        pipe.expire(index_key, refresh_ttl)
        await pipe.execute()


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
    """登出/轮换：删除 access 会话、refresh 记录与索引项。"""
    from app.extensions.redis_ext import get_redis

    redis = get_redis()
    index_key = _user_sessions_key(user_id)
    if refresh_jti is None:
        stored = await redis.hget(index_key, access_jti)
        if stored is not None:
            refresh_jti = stored.decode() if isinstance(stored, bytes) else str(stored)

    keys = [_session_key(user_id, access_jti)]
    if refresh_jti is not None:
        keys.append(_refresh_key(refresh_jti))
    await redis.delete(*keys)
    await redis.hdel(index_key, access_jti)
    if await redis.hlen(index_key) == 0:
        await redis.delete(index_key)


async def revoke_refresh(refresh_jti: str) -> None:
    """删除单个 refresh 记录（用于轮换时废弃旧 token）。"""
    from app.extensions.redis_ext import get_redis

    redis = get_redis()
    await redis.delete(_refresh_key(refresh_jti))


async def revoke_all_sessions(user_id: int) -> int:
    """撤销该用户全部已索引会话；返回撤销的会话数。"""
    from app.extensions.redis_ext import get_redis

    redis = get_redis()
    index_key = _user_sessions_key(user_id)
    mapping = await redis.hgetall(index_key)
    count = 0
    for raw_access_jti, raw_refresh_jti in mapping.items():
        access_jti = (
            raw_access_jti.decode() if isinstance(raw_access_jti, bytes) else str(raw_access_jti)
        )
        refresh_jti = (
            raw_refresh_jti.decode() if isinstance(raw_refresh_jti, bytes) else str(raw_refresh_jti)
        )
        await redis.delete(
            _session_key(user_id, access_jti),
            _refresh_key(refresh_jti),
        )
        count += 1
    await redis.delete(index_key)
    return count


__all__ = [
    "create_session",
    "is_session_active",
    "resolve_refresh",
    "revoke_all_sessions",
    "revoke_refresh",
    "revoke_session",
]
