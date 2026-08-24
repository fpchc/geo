"""认证服务：登录 / 刷新 / 登出。

token 结合 redis 白名单：
- login：校验密码 → 签 access+refresh(带 jti) → 写 redis 会话。
- refresh：校验 refresh + redis 存在 → 发新 access → 轮换 refresh。
- logout：删除 redis 会话，access 即时失效。
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import UnauthorizedException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    session_store,
    verify_password,
)
from app.repositories.user_repo import UserRepository
from app.schemas.auth import TokenResponse


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)

    async def login(self, username: str, password: str) -> TokenResponse:
        user = await self.users.get_by_username(username)
        if user is None or not user.is_active:
            raise UnauthorizedException("用户名或密码错误")
        if not await verify_password(password, user.hashed_password):
            raise UnauthorizedException("用户名或密码错误")

        access_token, access_jti = create_access_token(user.id)
        refresh_token, refresh_jti = create_refresh_token(user.id)
        await session_store.create_session(
            user.id,
            access_jti,
            refresh_jti,
            meta={"username": user.username},
        )
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.jwt_access_token_expire_minutes * 60,
        )

    async def refresh(self, refresh_token: str) -> TokenResponse:
        payload = decode_token(refresh_token, expected_type="refresh")
        refresh_jti = payload.get("jti")
        sub = payload.get("sub")
        if refresh_jti is None or sub is None:
            raise UnauthorizedException("刷新令牌无效")

        resolved = await session_store.resolve_refresh(refresh_jti)
        if resolved is None:
            raise UnauthorizedException("刷新令牌已失效，请重新登录")
        user_id, old_access_jti = resolved

        # 轮换：废弃旧 refresh 与旧 access 会话，签发新 token
        await session_store.revoke_session(user_id, old_access_jti, refresh_jti)

        new_access, new_access_jti = create_access_token(user_id)
        new_refresh, new_refresh_jti = create_refresh_token(user_id)
        await session_store.create_session(user_id, new_access_jti, new_refresh_jti)

        return TokenResponse(
            access_token=new_access,
            refresh_token=new_refresh,
            expires_in=settings.jwt_access_token_expire_minutes * 60,
        )

    async def logout(self, user_id: int, access_jti: str) -> None:
        await session_store.revoke_session(user_id, access_jti)
