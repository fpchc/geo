"""智能体路由（F-01）。"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import require_permission
from app.api.dependencies.services import get_agent_service
from app.schemas.content import AgentDetailOut, AgentOut
from app.schemas.response import BizResponse
from app.services.content.agent_service import AgentService

router = APIRouter(prefix="/content/agents", tags=["content:agent"])


@router.get(
    "",
    summary="智能体列表",
    dependencies=[Depends(require_permission("content:agent:list"))],
)
async def list_agents(
    service: AgentService = Depends(get_agent_service),
) -> BizResponse[list[AgentOut]]:
    return BizResponse.ok(await service.list_enabled())


@router.get(
    "/{agent_id}",
    summary="智能体详情（载入基础提示词）",
    dependencies=[Depends(require_permission("content:agent:query"))],
)
async def get_agent(
    agent_id: int,
    service: AgentService = Depends(get_agent_service),
) -> BizResponse[AgentDetailOut]:
    return BizResponse.ok(await service.get_detail(agent_id))
