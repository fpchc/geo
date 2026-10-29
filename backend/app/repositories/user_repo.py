"""用户仓储。"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.rbac import Role, User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(User, session)

    async def get_with_roles(self, user_id: int) -> User | None:
        stmt = select(User).where(User.id == user_id).options(selectinload(User.roles))
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def list_by_ids(self, ids: list[int]) -> list[User]:
        if not ids:
            return []
        stmt = select(User).where(User.id.in_(ids))
        return list((await self.session.execute(stmt)).scalars().all())

    async def get_by_username(self, username: str) -> User | None:
        stmt = select(User).where(User.username == username).options(selectinload(User.roles))
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def load_roles(self, role_ids: list[int]) -> list[Role]:
        if not role_ids:
            return []
        stmt = select(Role).where(Role.id.in_(role_ids))
        return list((await self.session.execute(stmt)).scalars().all())
