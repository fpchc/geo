"""智能体服务（F-01）：列表 + 载入基础提示词。"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.content import Agent
from app.repositories.content_repo import AgentRepository
from app.schemas.content import AgentDetailOut, AgentOut


class AgentService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.agents = AgentRepository(session)

    async def _get_or_404(self, agent_id: int) -> Agent:
        agent = await self.agents.get(agent_id)
        if agent is None:
            raise NotFoundException("智能体不存在")
        return agent

    async def list_enabled(self) -> list[AgentOut]:
        rows = await self.agents.list_enabled()
        return [AgentOut.model_validate(a) for a in rows]

    async def get_detail(self, agent_id: int) -> AgentDetailOut:
        """选中智能体后载入其后台配置的基础提示词。"""
        return AgentDetailOut.model_validate(await self._get_or_404(agent_id))
