"""全局复用依赖统一出口。"""

from __future__ import annotations

from app.api.dependencies.auth import get_current_user, require_permission
from app.api.dependencies.db import get_db
from app.api.dependencies.services import (
    get_auth_service,
    get_menu_service,
    get_role_service,
    get_user_service,
)

__all__ = [
    "get_auth_service",
    "get_current_user",
    "get_db",
    "get_menu_service",
    "get_role_service",
    "get_user_service",
    "require_permission",
]
