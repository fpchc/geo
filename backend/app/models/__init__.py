"""ORM models package.

所有模型必须在此导入，确保 Alembic autogenerate 能扫描到。
"""

from __future__ import annotations

from app.models.content import (
    Agent,
    Content,
    ContentStatus,
    ContentVersion,
    Material,
    Score,
    SystemSetting,
    VersionSource,
)
from app.models.rbac import (
    Menu,
    MenuType,
    Role,
    User,
    role_menu,
    user_role,
)

__all__ = [
    "Agent",
    "Content",
    "ContentStatus",
    "ContentVersion",
    "Material",
    "Menu",
    "MenuType",
    "Role",
    "Score",
    "SystemSetting",
    "User",
    "VersionSource",
    "role_menu",
    "user_role",
]
