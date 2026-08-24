"""全局鉴权依赖：get_current_user 复用出口。

require_permission 定义在 app.core.security，此处仅重导出方便路由层统一从
`app.api.dependencies` 引入。
"""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request

from app.api.dependencies.db import get_db
from app.core.context import CurrentUser
from app.core.security import require_permission, resolve_current_user


async def get_current_user(
    request: Request,
    session: AsyncSession = Depends(get_db),
) -> CurrentUser:
    """解析 Bearer 令牌并返回当前用户上下文。"""
    return await resolve_current_user(request, session)


__all__ = ["get_current_user", "require_permission"]
