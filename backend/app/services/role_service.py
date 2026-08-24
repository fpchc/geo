"""角色服务：CRUD + 分配菜单（权限码随授权菜单的按钮节点自动获得）。"""

from __future__ import annotations

from sqlalchemy import asc, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.core.security import invalidate_role
from app.models.rbac import Role
from app.repositories.role_repo import RoleRepository
from app.schemas.pagination import PaginationParams
from app.schemas.role import RoleCreate, RoleOut, RoleQuery, RoleUpdate


class RoleService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.roles = RoleRepository(session)

    @staticmethod
    def _to_out(role: Role) -> RoleOut:
        return RoleOut(
            id=role.id,
            code=role.code,
            name=role.name,
            description=role.description,
            menu_ids=[m.id for m in role.menus],
        )

    async def _get_or_404(self, role_id: int) -> Role:
        role = await self.roles.get_with_relations(role_id)
        if role is None:
            raise NotFoundException("角色不存在")
        return role

    async def create(self, data: RoleCreate) -> RoleOut:
        if await self.roles.get_by(code=data.code) is not None:
            raise ConflictException("角色编码已存在")
        role = Role(code=data.code, name=data.name, description=data.description)
        if data.menu_ids:
            role.menus = await self.roles.load_menus(data.menu_ids)
        await self.roles.create(role)
        return self._to_out(role)

    async def update(self, role_id: int, data: RoleUpdate) -> RoleOut:
        role = await self._get_or_404(role_id)
        payload = data.model_dump(exclude_unset=True)
        for field, value in payload.items():
            setattr(role, field, value)
        await self.session.flush()
        return self._to_out(role)

    async def delete(self, role_id: int) -> None:
        role = await self._get_or_404(role_id)
        await self.roles.delete(role)
        await invalidate_role(role_id)

    async def get(self, role_id: int) -> RoleOut:
        return self._to_out(await self._get_or_404(role_id))

    async def assign_menus(self, role_id: int, menu_ids: list[int]) -> RoleOut:
        role = await self._get_or_404(role_id)
        role.menus = await self.roles.load_menus(menu_ids)
        await self.session.flush()
        # 授权变更：失效该角色权限码缓存，下次鉴权按新授权重建
        await invalidate_role(role_id)
        return self._to_out(role)

    async def paginate(self, query: RoleQuery, page: PaginationParams) -> tuple[list[RoleOut], int]:
        filters = []
        if query.code:
            filters.append(Role.code.like(f"%{query.code}%"))
        if query.name:
            filters.append(Role.name.like(f"%{query.name}%"))

        order_col = getattr(Role, page.sort_by, Role.id) if page.sort_by else Role.id
        order_by = asc(order_col) if page.sort_order == "asc" else desc(order_col)

        rows, total = await self.roles.paginate(
            offset=page.offset, limit=page.limit, filters=filters, order_by=order_by
        )
        # 分页行未预载关系，逐个补齐以输出 ids
        out = [self._to_out(await self._get_or_404(r.id)) for r in rows]
        return out, total
