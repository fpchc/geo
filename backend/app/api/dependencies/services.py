"""Service 依赖工厂：统一经 FastAPI DI 注入，路由层不再手动 new。

每个工厂绑定请求作用域的 AsyncSession（get_db），保证 service 与请求事务边界
一致；测试可通过 app.dependency_overrides 替换为 Mock service。
"""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.db import get_db
from app.core.providers import (
    LLMProvider,
    StorageProvider,
    get_llm_provider,
    get_storage_provider,
)
from app.services.auth_service import AuthService
from app.services.content.agent_service import AgentService
from app.services.content.content_service import ContentService
from app.services.content.material_service import MaterialService
from app.services.content.review_service import ReviewService
from app.services.content.setting_service import SettingService
from app.services.menu_service import MenuService
from app.services.role_service import RoleService
from app.services.user_service import UserService


def get_auth_service(session: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(session)


def get_user_service(session: AsyncSession = Depends(get_db)) -> UserService:
    return UserService(session)


def get_role_service(session: AsyncSession = Depends(get_db)) -> RoleService:
    return RoleService(session)


def get_menu_service(session: AsyncSession = Depends(get_db)) -> MenuService:
    return MenuService(session)


# ---- 内容生产模块 ----
def get_agent_service(session: AsyncSession = Depends(get_db)) -> AgentService:
    return AgentService(session)


def get_content_service(session: AsyncSession = Depends(get_db)) -> ContentService:
    return ContentService(session)


def get_setting_service(session: AsyncSession = Depends(get_db)) -> SettingService:
    return SettingService(session)


def get_material_service(
    session: AsyncSession = Depends(get_db),
    storage: StorageProvider = Depends(get_storage_provider),
) -> MaterialService:
    return MaterialService(session, storage)


def get_review_service(
    session: AsyncSession = Depends(get_db),
    llm: LLMProvider = Depends(get_llm_provider),
) -> ReviewService:
    return ReviewService(session, llm)


__all__ = [
    "get_agent_service",
    "get_auth_service",
    "get_content_service",
    "get_material_service",
    "get_menu_service",
    "get_review_service",
    "get_role_service",
    "get_setting_service",
    "get_user_service",
]
