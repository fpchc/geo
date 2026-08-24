"""内容生产数据持久层（POC）。

每个仓储对应一个聚合，继承泛型 BaseRepository 复用通用 CRUD/分页；
领域专用查询在此以显式方法暴露，service 不直接写 SQLAlchemy。
"""

from __future__ import annotations

from sqlalchemy import select
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
