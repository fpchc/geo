"""Service 依赖工厂：统一经 FastAPI DI 注入，路由层不再手动 new。

每个工厂绑定请求作用域的 AsyncSession（get_db），保证 service 与请求事务边界
一致；测试可通过 app.dependency_overrides 替换为 Mock service。
"""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.db import get_db
from app.core.config import settings
from app.core.providers import (
    LLMProvider,
    StorageProvider,
    get_llm_provider,
    get_storage_provider,
)
from app.core.security import LoginGuard, LoginGuardConfig
from app.services.auth_service import AuthService
from app.services.content.agent_service import AgentService
from app.services.content.content_service import ContentService
from app.services.content.material_service import MaterialService
from app.services.content.review_service import ReviewService
from app.services.content.setting_service import SettingService
from app.services.dashboard_service import DashboardService
from app.services.menu_service import MenuService
from app.services.role_service import RoleService
from app.services.user_service import UserService


def get_login_guard() -> LoginGuard:
    from app.extensions.redis_ext import get_redis

    return LoginGuard(
        get_redis(),
        LoginGuardConfig(
            rate_limit=settings.auth_login_rate_limit_per_minute,
            rate_window_seconds=settings.auth_login_rate_window_seconds,
            rate_key_prefix=settings.login_rate_key_prefix,
            failure_threshold=settings.auth_login_failure_threshold,
            failure_window_seconds=settings.auth_login_failure_window_minutes * 60,
            lockout_seconds=settings.auth_login_lockout_minutes * 60,
            failure_key_prefix=settings.login_failure_key_prefix,
            lock_key_prefix=settings.login_lock_key_prefix,
        ),
    )


def get_auth_service(
    session: AsyncSession = Depends(get_db),
    guard: LoginGuard = Depends(get_login_guard),
) -> AuthService:
    return AuthService(session, guard)


def get_user_service(session: AsyncSession = Depends(get_db)) -> UserService:
    return UserService(session)


def get_role_service(session: AsyncSession = Depends(get_db)) -> RoleService:
    return RoleService(session)


def get_menu_service(session: AsyncSession = Depends(get_db)) -> MenuService:
    return MenuService(session)


# ---- 内容生产模块 ----
def get_agent_service(session: AsyncSession = Depends(get_db)) -> AgentService:
    return AgentService(session)


def get_dashboard_service(session: AsyncSession = Depends(get_db)) -> DashboardService:
    return DashboardService(session)


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
    "get_dashboard_service",
    "get_material_service",
    "get_menu_service",
    "get_review_service",
    "get_role_service",
    "get_setting_service",
    "get_user_service",
]
