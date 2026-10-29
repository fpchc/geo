"""认证路由：登录 / 刷新 / 登出 / 当前用户。

均为认证基础端点，不挂业务权限码；login/refresh 为公开端点。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.services import get_auth_service
from app.core.context import CurrentUser
from app.core.exceptions import UnauthorizedException
from app.schemas.auth import (
    CurrentUserInfo,
    LoginRequest,
    RefreshRequest,
    TokenResponse,
)
from app.schemas.response import BizResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["system:auth"])


@router.post("/login", summary="用户登录")
async def login(
    body: LoginRequest,
    request: Request,
    service: AuthService = Depends(get_auth_service),
) -> BizResponse[TokenResponse]:
    client_ip = request.client.host if request.client else "unknown"
    tokens = await service.login(body.username, body.password, client_ip)
    return BizResponse.ok(tokens)


@router.post("/refresh", summary="刷新访问令牌")
async def refresh(
    body: RefreshRequest,
    service: AuthService = Depends(get_auth_service),
) -> BizResponse[TokenResponse]:
    tokens = await service.refresh(body.refresh_token)
    return BizResponse.ok(tokens)


@router.post("/logout", summary="退出登录")
async def logout(
    current: CurrentUser = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
) -> BizResponse[None]:
    if current.access_jti is None:
        raise UnauthorizedException("无效会话")
    await service.logout(current.user_id, current.access_jti)
    return BizResponse.ok(None, message="已退出登录")


@router.get("/me", summary="获取当前登录用户")
async def me(
    current: CurrentUser = Depends(get_current_user),
) -> BizResponse[CurrentUserInfo]:
    info = CurrentUserInfo(
        user_id=current.user_id,
        username=current.username,
        permissions=sorted(current.permission_codes),
    )
    return BizResponse.ok(info)
