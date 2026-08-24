"""认证授权子包：JWT 鉴权 + 权限扫描。"""

from __future__ import annotations

from app.core.security.password import hash_password, verify_password
from app.core.security.permission_cache import (
    collect_permission_codes,
    invalidate_menus,
    invalidate_role,
)
from app.core.security.permission_scanner import audit_permission_codes
from app.core.security.security import (
    create_access_token,
    create_refresh_token,
    declared_permission_codes,
    decode_token,
    require_permission,
    resolve_current_user,
)

__all__ = [
    "audit_permission_codes",
    "collect_permission_codes",
    "create_access_token",
    "create_refresh_token",
    "declared_permission_codes",
    "decode_token",
    "hash_password",
    "invalidate_menus",
    "invalidate_role",
    "require_permission",
    "resolve_current_user",
    "verify_password",
]
