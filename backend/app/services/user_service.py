"""用户服务：CRUD + 改密 + 分配角色。"""

from __future__ import annotations

from sqlalchemy import asc, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.core.security import hash_password
from app.models.rbac import User
from app.repositories.user_repo import UserRepository
from app.schemas.pagination import PaginationParams
from app.schemas.user import UserCreate, UserOut, UserQuery, UserUpdate


class UserService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)

    @staticmethod
    def _to_out(user: User) -> UserOut:
        return UserOut(
            id=user.id,
            username=user.username,
            nickname=user.nickname,
            email=user.email,
            phone=user.phone,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            role_ids=[r.id for r in user.roles],
        )

    async def _get_or_404(self, user_id: int) -> User:
        user = await self.users.get_with_roles(user_id)
        if user is None:
            raise NotFoundException("用户不存在")
        return user

    async def create(self, data: UserCreate) -> UserOut:
        if await self.users.get_by_username(data.username) is not None:
            raise ConflictException("用户名已存在")
        user = User(
            username=data.username,
            hashed_password=await hash_password(data.password),
            nickname=data.nickname,
            email=data.email,
            phone=data.phone,
            is_active=data.is_active,
            is_superuser=data.is_superuser,
        )
        if data.role_ids:
            user.roles = await self.users.load_roles(data.role_ids)
        await self.users.create(user)
        return self._to_out(user)

    async def update(self, user_id: int, data: UserUpdate) -> UserOut:
        user = await self._get_or_404(user_id)
        payload = data.model_dump(exclude_unset=True)
        for field, value in payload.items():
            setattr(user, field, value)
        await self.session.flush()
        return self._to_out(user)

    async def delete(self, user_id: int) -> None:
        user = await self._get_or_404(user_id)
        await self.users.delete(user)

    async def get(self, user_id: int) -> UserOut:
        return self._to_out(await self._get_or_404(user_id))

    async def reset_password(self, user_id: int, new_password: str) -> None:
        user = await self._get_or_404(user_id)
        user.hashed_password = await hash_password(new_password)
        await self.session.flush()

    async def assign_roles(self, user_id: int, role_ids: list[int]) -> UserOut:
        user = await self._get_or_404(user_id)
        user.roles = await self.users.load_roles(role_ids)
        await self.session.flush()
        return self._to_out(user)

    async def paginate(self, query: UserQuery, page: PaginationParams) -> tuple[list[UserOut], int]:
        filters = []
        if query.username:
            filters.append(User.username.like(f"%{query.username}%"))
        if query.is_active is not None:
            filters.append(User.is_active.is_(query.is_active))

        order_col = getattr(User, page.sort_by, User.id) if page.sort_by else User.id
        order_by = asc(order_col) if page.sort_order == "asc" else desc(order_col)

        rows, total = await self.users.paginate(
            offset=page.offset, limit=page.limit, filters=filters, order_by=order_by
        )
        # 关系已通过 selectin 预载
        return [self._to_out(u) for u in rows], total
