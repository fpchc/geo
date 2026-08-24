"""内容生产模块路由聚合（POC）。"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.content.agent import router as agent_router
from app.api.content.content import router as content_router
from app.api.content.material import router as material_router
from app.api.content.review import router as review_router
from app.api.content.setting import router as setting_router

content_router_group = APIRouter()
content_router_group.include_router(agent_router)
content_router_group.include_router(material_router)
content_router_group.include_router(content_router)
content_router_group.include_router(review_router)
content_router_group.include_router(setting_router)

__all__ = ["content_router_group"]
