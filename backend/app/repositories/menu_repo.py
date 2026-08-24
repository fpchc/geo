"""菜单仓储。

子树查询用尾分隔符防误匹配：查节点 N 及其子孙用
`id = N OR ancestors LIKE '<N的完整路径>,%'`。
"""

from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rbac import Menu, MenuType, role_menu
from app.repositories.base import BaseRepository


class MenuRepository(BaseRepository[Menu]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Menu, session)

    async def all_button_perm_codes(self) -> set[str]:
        """全部按钮节点的 perm_code（超级用户拥有全部）。"""
        stmt = select(Menu.perm_code).where(
            Menu.type.in_([int(MenuType.BUTTON), int(MenuType.MENU)]),
            Menu.perm_code.is_not(None),
        )
        return set((await self.session.execute(stmt)).scalars().all())

    async def perm_codes_of_role(self, role_id: int) -> set[str]:
        """单个角色经授权菜单聚合出的按钮 perm_code 集合。"""
        stmt = (
            select(Menu.perm_code)
            .join(role_menu, role_menu.c.menu_id == Menu.id)
            .where(
                role_menu.c.role_id == role_id,
                Menu.type.in_([int(MenuType.BUTTON), int(MenuType.MENU)]),
                Menu.perm_code.is_not(None),
            )
            .distinct()
        )
        return set((await self.session.execute(stmt)).scalars().all())

    async def role_ids_holding_menus(self, menu_ids: list[int]) -> set[int]:
        """反查持有指定菜单的角色 id（用于菜单变更时精确失效权限缓存）。"""
        if not menu_ids:
            return set()
        stmt = select(role_menu.c.role_id).where(role_menu.c.menu_id.in_(menu_ids)).distinct()
        return set((await self.session.execute(stmt)).scalars().all())

    async def list_ordered(self) -> list[Menu]:
        """全量菜单，按 order_no 升序（建树时 children 天然有序）。"""
        stmt = select(Menu).order_by(Menu.order_no.asc(), Menu.id.asc())
        return list((await self.session.execute(stmt)).scalars().all())

    async def list_subtree(self, node: Menu) -> list[Menu]:
        """返回节点自身及其所有子孙。self_path 为该节点的完整祖先路径。"""
        self_path = f"{node.ancestors},{node.id}" if node.ancestors else str(node.id)
        stmt = select(Menu).where(or_(Menu.id == node.id, Menu.ancestors.like(f"{self_path},%")))
        return list((await self.session.execute(stmt)).scalars().all())

    async def has_children(self, menu_id: int) -> bool:
        stmt = select(Menu.id).where(Menu.parent_id == menu_id).limit(1)
        return (await self.session.execute(stmt)).first() is not None
