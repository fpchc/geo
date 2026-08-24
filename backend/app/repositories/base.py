"""泛型仓储基类：通用 CRUD 与分页查询。

子类指定具体 ORM 模型；所有方法均为 SQLAlchemy 2.0 异步。
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base


class BaseRepository[ModelT: Base]:
    """针对单一模型的通用仓储。"""

    def __init__(self, model: type[ModelT], session: AsyncSession) -> None:
        self.model = model
        self.session = session

    async def get(self, obj_id: int) -> ModelT | None:
        return await self.session.get(self.model, obj_id)

    async def get_by(self, **filters: Any) -> ModelT | None:
        stmt = select(self.model).filter_by(**filters).limit(1)
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def list_all(self) -> list[ModelT]:
        stmt = select(self.model)
        return list((await self.session.execute(stmt)).scalars().all())

    async def paginate(
        self,
        *,
        offset: int,
        limit: int,
        filters: list[Any] | None = None,
        order_by: Any = None,
    ) -> tuple[list[ModelT], int]:
        """返回 (当前页数据, 总数)。"""
        conditions = filters or []

        count_stmt = select(func.count()).select_from(self.model)
        if conditions:
            count_stmt = count_stmt.where(*conditions)
        total = int((await self.session.execute(count_stmt)).scalar_one())

        stmt = select(self.model)
        if conditions:
            stmt = stmt.where(*conditions)
        if order_by is not None:
            stmt = stmt.order_by(order_by)
        stmt = stmt.offset(offset).limit(limit)
        rows = list((await self.session.execute(stmt)).scalars().all())
        return rows, total

    async def create(self, obj: ModelT) -> ModelT:
        self.session.add(obj)
        await self.session.flush()
        return obj

    async def delete(self, obj: ModelT) -> None:
        await self.session.delete(obj)
        await self.session.flush()
