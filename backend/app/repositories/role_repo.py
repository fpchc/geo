"""角色仓储。"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.rbac import Menu, Role
from app.repositories.base import BaseRepository


class RoleRepository(BaseRepository[Role]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Role, session)

    async def get_with_relations(self, role_id: int) -> Role | None:
        stmt = select(Role).where(Role.id == role_id).options(selectinload(Role.menus))
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def load_menus(self, menu_ids: list[int]) -> list[Menu]:
        if not menu_ids:
            return []
        stmt = select(Menu).where(Menu.id.in_(menu_ids))
        return list((await self.session.execute(stmt)).scalars().all())
