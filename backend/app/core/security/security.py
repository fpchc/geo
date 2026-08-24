"""认证授权：JWT 解析 + require_permission 依赖工厂。

- 解析 Bearer Token → 载入当前用户及权限码集合 → 注入 contextvars。
- `require_permission(code)` 返回一个 FastAPI 依赖，校验当前用户是否持有权限码。
"""

from __future__ import annotations

import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import jwt
from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.context import CurrentUser, set_current_user
from app.core.exceptions import (
    PermissionDeniedException,
    TokenExpiredException,
    TokenInvalidException,
    UnauthorizedException,
)
from app.core.security import session_store
from app.core.security.permission_cache import collect_permission_codes
from app.models.rbac import User

type TokenType = Literal["access", "refresh"]

# require_permission 声明的权限码收集器，供 permission_scanner 读取。
# 结构：{"user:profile:read", ...}
declared_permission_codes: set[str] = set()


def _new_jti() -> str:
    return uuid.uuid4().hex


def create_access_token(
    subject: str | int,
    *,
    jti: str | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> tuple[str, str]:
    """签发 JWT 访问令牌，返回 (token, jti)。"""
    token_jti = jti or _new_jti()
    now = datetime.now(UTC)
    expire = now + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "jti": token_jti,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    if extra_claims:
        payload.update(extra_claims)
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, token_jti


def create_refresh_token(subject: str | int, *, jti: str | None = None) -> tuple[str, str]:
    """签发 JWT 刷新令牌，返回 (token, jti)。"""
    token_jti = jti or _new_jti()
    now = datetime.now(UTC)
    expire = now + timedelta(days=settings.jwt_refresh_token_expire_days)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "jti": token_jti,
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, token_jti


def decode_token(token: str, *, expected_type: TokenType | None = None) -> dict[str, Any]:
    """解析并校验 JWT；expected_type 给定时校验 token 类型。"""
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.ExpiredSignatureError as exc:
        raise TokenExpiredException() from exc
    except jwt.PyJWTError as exc:
        raise TokenInvalidException() from exc

    if expected_type is not None and payload.get("type") != expected_type:
        raise TokenInvalidException(f"令牌类型错误，期望 {expected_type}")
    return payload


def _extract_bearer_token(request: Request) -> str:
    header = request.headers.get("Authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise UnauthorizedException("缺少 Bearer 令牌")
    return token


async def _load_user(session: AsyncSession, user_id: int) -> User:
    # roles 关系在模型上 lazy="selectin"，无需显式 selectinload
    stmt = select(User).where(User.id == user_id)
    user = (await session.execute(stmt)).scalar_one_or_none()
    if user is None or not user.is_active:
        raise UnauthorizedException("用户不存在或已禁用")
    return user


async def resolve_current_user(request: Request, session: AsyncSession) -> CurrentUser:
    """核心鉴权逻辑：解析 access token → 校验 redis 白名单 → 载入用户与权限码。"""
    token = _extract_bearer_token(request)
    payload = decode_token(token, expected_type="access")

    sub = payload.get("sub")
    jti = payload.get("jti")
    if sub is None or jti is None:
        raise TokenInvalidException("令牌缺少 subject 或 jti")
    try:
        user_id = int(sub)
    except (TypeError, ValueError) as exc:
        raise TokenInvalidException("令牌 subject 非法") from exc

    # 白名单校验：会话不在 redis（已登出/被吊销）则拒绝
    if not await session_store.is_session_active(user_id, jti):
        raise UnauthorizedException("会话已失效，请重新登录")

    user = await _load_user(session, user_id)
    codes = frozenset(
        await collect_permission_codes(
            session,
            is_superuser=user.is_superuser,
            role_ids=[role.id for role in user.roles],
        )
    )

    current = CurrentUser(
        user_id=user.id,
        is_superuser=user.is_superuser,
        username=user.username,
        permission_codes=codes,
        access_jti=jti,
    )
    set_current_user(current)
    return current


def require_permission(code: str) -> Callable[..., Awaitable[CurrentUser]]:
    """权限依赖工厂：返回校验指定权限码的 FastAPI 依赖。

    调用即在导入期登记权限码，供启动时的 permission_scanner upsert。
    """
    declared_permission_codes.add(code)

    # 延迟导入避免与 dependencies 循环依赖
    from app.api.dependencies.auth import get_current_user

    async def _dependency(
        current: CurrentUser = Depends(get_current_user),
    ) -> CurrentUser:
        if current.is_superuser:
            return current
        if not current.has_permission(code):
            raise PermissionDeniedException(f"缺少权限：{code}")
        return current

    return _dependency
