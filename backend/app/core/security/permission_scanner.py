"""权限码启动审计器。

权限模型：无独立 Permission 表。权限码的唯一落库来源是菜单按钮节点
（Menu.type=BUTTON）的 perm_code，由 scripts/menu_seed.py 单一数据源维护。

启动 lifespan 阶段本审计器只做**一致性校验**，不写库：
1. 收集代码中通过 `require_permission("...")` 声明的权限码。
2. 收集菜单按钮节点已配置的 perm_code。
3. 比对两侧差异并写入日志，提示开发者补齐菜单种子或清理僵尸权限码：
   - 代码已声明但菜单未覆盖 → 该接口无任何角色可授权，需在 menu_seed 补按钮。
   - 菜单已配置但代码无对应接口 → 僵尸权限码，建议从 menu_seed 移除。

权限码遵循 `{module}:{resource}:{action}` 三段式。
"""

from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security.security import declared_permission_codes
from app.models.rbac import Menu, MenuType

logger = logging.getLogger(__name__)


async def audit_permission_codes(session: AsyncSession) -> None:
    """校验代码声明的权限码与菜单按钮 perm_code 的一致性（只读，不写库）。"""
    declared: set[str] = set(declared_permission_codes)

    stmt = select(Menu.perm_code).where(
        Menu.type == int(MenuType.BUTTON),
        Menu.perm_code.is_not(None),
    )
    menu_codes: set[str] = set((await session.execute(stmt)).scalars().all())

    missing_in_menu = sorted(declared - menu_codes)
    orphan_in_menu = sorted(menu_codes - declared)

    if missing_in_menu:
        logger.warning(
            "权限码已在接口声明但菜单按钮未覆盖（这些接口暂无角色可授权，请补 menu_seed）：%s",
            missing_in_menu,
        )
    if orphan_in_menu:
        logger.warning(
            "菜单按钮 perm_code 无对应接口声明（僵尸权限码，建议从 menu_seed 移除）：%s",
            orphan_in_menu,
        )
    logger.info(
        "permission audit done: declared=%d menu_buttons=%d missing_in_menu=%d orphan_in_menu=%d",
        len(declared),
        len(menu_codes),
        len(missing_in_menu),
        len(orphan_in_menu),
    )
