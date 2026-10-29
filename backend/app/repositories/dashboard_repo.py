"""Dashboard 只读聚合数据访问。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.content import Content, Score


class DashboardRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def contents_in_range(
        self,
        start: datetime,
        end: datetime,
        agent_id: int | None,
    ) -> list[Content]:
        stmt = select(Content).where(Content.created_at >= start, Content.created_at < end)
        if agent_id is not None:
            stmt = stmt.where(Content.agent_id == agent_id)
        stmt = stmt.order_by(Content.id)
        return list((await self.session.execute(stmt)).scalars().all())

    async def scores_for_contents(self, content_ids: list[int]) -> list[Score]:
        if not content_ids:
            return []
        stmt = select(Score).where(Score.content_id.in_(content_ids)).order_by(Score.id)
        return list((await self.session.execute(stmt)).scalars().all())
