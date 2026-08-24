"""总后台（Admin）API 聚合路由。"""

from __future__ import annotations

from fastapi import APIRouter

# 直接导入子模块,避免 `from app.api import X` 在 admin.__init__ 内形成循环
from app.api.auth import router as auth_router
from app.api.content import content_router_group
from app.api.health import router as health_router
from app.api.identity.menu import router as menu_router
from app.api.identity.role import router as role_router
from app.api.identity.user import router as user_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(user_router)
api_router.include_router(role_router)
api_router.include_router(menu_router)
api_router.include_router(content_router_group)

__all__ = ["api_router"]
