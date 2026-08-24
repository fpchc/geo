"""权限码缓存（按角色，cache-aside）。

鉴权路径原先每个请求都 join 一次 role → role_menu → menu 聚合权限码，
纯浪费。此模块以 Redis 缓存权限码集合，失效粒度按角色：

- 普通用户：请求时取其各角色的缓存集合做并集；缓存键 `perm:role:{role_id}`。
- 超级用户：全部按钮 perm_code 单独缓存于 `perm:super`。
- 失效点：角色授权菜单变更、菜单按钮 perm_code 变更 / 删除时精确删除受影响的键。
- TTL 兜底防脏数据长期残留。

用户改角色无需动缓存——角色集合变化在请求端并集时自然反映。

get_redis 在函数内惰性导入，规避 security → extensions → db_ext → security 的
模块级循环导入（与 session_store 同一约定）。
"""

from __future__ import annotations

import json

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.repositories.menu_repo import MenuRepository


def _role_key(role_id: int) -> str:
    return f"{settings.perm_cache_role_prefix}:{role_id}"


async def _read_cached(key: str) -> set[str] | None:
    """读缓存；命中返回集合，未命中返回 None。"""
    from app.extensions.redis_ext import get_redis

    raw = await get_redis().get(key)
    if raw is None:
        return None
    value = raw.decode() if isinstance(raw, bytes) else str(raw)
    return set(json.loads(value))


async def _write_cached(key: str, codes: set[str]) -> None:
    from app.extensions.redis_ext import get_redis

    payload = json.dumps(sorted(codes), ensure_ascii=False)
    await get_redis().set(key, payload, ex=settings.perm_cache_ttl_seconds)


async def _role_permission_codes(session: AsyncSession, role_id: int) -> set[str]:
    """单角色权限码：命中缓存直接返回，未命中查库回填。"""
    key = _role_key(role_id)
    cached = await _read_cached(key)
    if cached is not None:
        return cached
    codes = await MenuRepository(session).perm_codes_of_role(role_id)
    await _write_cached(key, codes)
    return codes


async def _super_permission_codes(session: AsyncSession) -> set[str]:
    """超级用户全量按钮码：命中缓存直接返回，未命中查库回填。"""
    key = settings.perm_cache_super_key
    cached = await _read_cached(key)
    if cached is not None:
        return cached
    codes = await MenuRepository(session).all_button_perm_codes()
    await _write_cached(key, codes)
    return codes


async def collect_permission_codes(
    session: AsyncSession,
    *,
    is_superuser: bool,
    role_ids: list[int],
) -> set[str]:
    """聚合用户权限码集合（走缓存）。"""
    if is_superuser:
        return await _super_permission_codes(session)
    codes: set[str] = set()
    for role_id in role_ids:
        codes |= await _role_permission_codes(session, role_id)
    return codes


async def invalidate_role(role_id: int) -> None:
    """角色授权菜单变更后失效其权限缓存。"""
    from app.extensions.redis_ext import get_redis

    await get_redis().delete(_role_key(role_id))


async def invalidate_menus(session: AsyncSession, menu_ids: list[int]) -> None:
    """菜单（按钮 perm_code）变更后，精确失效持有这些菜单的角色缓存 + 超级用户缓存。

    超级用户拥有全部按钮码，任一按钮 perm_code 变更都可能影响其集合，故一并失效。
    """
    from app.extensions.redis_ext import get_redis

    role_ids = await MenuRepository(session).role_ids_holding_menus(menu_ids)
    keys = [_role_key(rid) for rid in role_ids]
    keys.append(settings.perm_cache_super_key)
    await get_redis().delete(*keys)


__all__ = [
    "collect_permission_codes",
    "invalidate_menus",
    "invalidate_role",
]
