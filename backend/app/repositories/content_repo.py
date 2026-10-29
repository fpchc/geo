"""内容生产数据持久层（POC）。

每个仓储对应一个聚合，继承泛型 BaseRepository 复用通用 CRUD/分页；
领域专用查询在此以显式方法暴露，service 不直接写 SQLAlchemy。
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.content import (
    Agent,
    Content,
    ContentVersion,
    Material,
    Score,
    SystemSetting,
)
from app.repositories.base import BaseRepository


class AgentRepository(BaseRepository[Agent]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Agent, session)

    async def list_enabled(self) -> list[Agent]:
        stmt = select(Agent).where(Agent.enabled.is_(True)).order_by(Agent.id)
        return list((await self.session.execute(stmt)).scalars().all())


class ContentRepository(BaseRepository[Content]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Content, session)

    async def paginate_with_title(
        self,
        *,
        offset: int,
        limit: int,
        filters: list[Any] | None = None,
        keyword: str | None = None,
        order_by: Any = None,
    ) -> tuple[list[Content], int]:
        """分页查询内容，并按当前版本标题做可选模糊筛选。"""
        conditions = list(filters or [])
        join_condition = Content.current_version_id == ContentVersion.id
        if keyword:
            conditions.append(ContentVersion.title.ilike(f"%{keyword}%"))

        count_stmt = (
            select(func.count()).select_from(Content).outerjoin(ContentVersion, join_condition)
        )
        if conditions:
            count_stmt = count_stmt.where(*conditions)
        total = int((await self.session.execute(count_stmt)).scalar_one())

        stmt = select(Content).outerjoin(ContentVersion, join_condition)
        if conditions:
            stmt = stmt.where(*conditions)
        if order_by is not None:
            stmt = stmt.order_by(order_by)
        stmt = stmt.offset(offset).limit(limit)
        rows = list((await self.session.execute(stmt)).scalars().all())
        return rows, total


class VersionRepository(BaseRepository[ContentVersion]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(ContentVersion, session)

    async def list_by_content(self, content_id: int) -> list[ContentVersion]:
        stmt = (
            select(ContentVersion)
            .where(ContentVersion.content_id == content_id)
            .order_by(ContentVersion.id.desc())
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def titles_by_ids(self, version_ids: list[int]) -> dict[int, str]:
        if not version_ids:
            return {}
        stmt = select(ContentVersion.id, ContentVersion.title).where(
            ContentVersion.id.in_(version_ids)
        )
        result: dict[int, str] = {}
        for version_id, title in (await self.session.execute(stmt)).all():
            result[version_id] = title
        return result


class ScoreRepository(BaseRepository[Score]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Score, session)

    async def latest_by_content(self, content_id: int) -> Score | None:
        stmt = (
            select(Score).where(Score.content_id == content_id).order_by(Score.id.desc()).limit(1)
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()


class MaterialRepository(BaseRepository[Material]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Material, session)

    async def list_by_ids(self, ids: list[int]) -> list[Material]:
        if not ids:
            return []
        stmt = select(Material).where(Material.id.in_(ids))
        return list((await self.session.execute(stmt)).scalars().all())


class SettingRepository(BaseRepository[SystemSetting]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(SystemSetting, session)

    async def get_by_key(self, key: str) -> SystemSetting | None:
        return await self.get_by(key=key)
