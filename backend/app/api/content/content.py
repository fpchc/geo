"""内容路由（F-09 生成 / F-10 预览 / F-13 重新生成上限 / 留存 / 任务查询）。

生成与重新生成为异步任务 + 外部大模型调用，挂 require_idempotency_key。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import require_permission
from app.api.dependencies.services import get_content_service
from app.core.exceptions import NotFoundException
from app.core.tasks.task_store import get_task
from app.schemas.content import (
    ContentDetailOut,
    ContentOut,
    ContentQuery,
    GenerateAccepted,
    GenerateRequest,
    GenerateTaskOut,
    VersionOut,
)
from app.schemas.pagination import PaginatedResponse, PaginationParams
from app.schemas.response import BizResponse
from app.services.content.content_service import ContentService

router = APIRouter(prefix="/content/contents", tags=["content:content"])

_TASK_TYPE = "content_generate"


@router.get(
    "",
    summary="内容分页列表",
    dependencies=[Depends(require_permission("content:content:list"))],
)
async def list_contents(
    query: ContentQuery = Depends(),
    page: PaginationParams = Depends(),
    service: ContentService = Depends(get_content_service),
) -> BizResponse[PaginatedResponse[ContentOut]]:
    items, total = await service.paginate(
        offset=page.offset,
        limit=page.limit,
        status=query.status,
        agent_id=query.agent_id,
        keyword=query.keyword,
        sort_by=page.sort_by,
        sort_order=page.sort_order,
    )
    return BizResponse.ok(PaginatedResponse.build(items, total, page))


@router.post(
    "/generate",
    summary="发起内容生成（新建内容）",
    description="提交生成任务。需携带 X-Idempotency-Key。返回 content_id + task_id，轮询任务状态。",
    dependencies=[
        Depends(require_permission("content:content:generate")),
        # Depends(require_idempotency_key),
    ],
)
async def generate_content(
    body: GenerateRequest,
    service: ContentService = Depends(get_content_service),
) -> BizResponse[GenerateAccepted]:
    return BizResponse.ok(await service.generate(body, content_id=None))


@router.post(
    "/{content_id}/regenerate",
    summary="重新生成（受 10 次上限约束，达上限锁定）",
    description="对已有内容重新生成。需携带 X-Idempotency-Key。达上限返回 409 锁定。",
    dependencies=[
        Depends(require_permission("content:content:generate")),
        # Depends(require_idempotency_key),
    ],
)
async def regenerate_content(
    content_id: int,
    body: GenerateRequest,
    service: ContentService = Depends(get_content_service),
) -> BizResponse[GenerateAccepted]:
    return BizResponse.ok(await service.generate(body, content_id=content_id))


@router.get(
    "/tasks/{task_id}",
    summary="查询生成任务状态",
    dependencies=[Depends(require_permission("content:content:query"))],
)
async def get_generate_task(task_id: str) -> BizResponse[GenerateTaskOut]:
    task = await get_task(_TASK_TYPE, task_id)
    if task is None:
        raise NotFoundException("任务不存在或已过期")
    return BizResponse.ok(GenerateTaskOut.model_validate(task))


@router.get(
    "/{content_id}",
    summary="内容详情（含当前版本 md 正文）",
    dependencies=[Depends(require_permission("content:content:query"))],
)
async def get_content(
    content_id: int,
    service: ContentService = Depends(get_content_service),
) -> BizResponse[ContentDetailOut]:
    return BizResponse.ok(await service.get_detail(content_id))


@router.get(
    "/{content_id}/versions",
    summary="内容版本列表",
    dependencies=[Depends(require_permission("content:content:query"))],
)
async def list_versions(
    content_id: int,
    service: ContentService = Depends(get_content_service),
) -> BizResponse[list[VersionOut]]:
    return BizResponse.ok(await service.list_versions(content_id))


@router.post(
    "/{content_id}/retain",
    summary="确认留存内容",
    dependencies=[Depends(require_permission("content:content:create"))],
)
async def retain_content(
    content_id: int,
    service: ContentService = Depends(get_content_service),
) -> BizResponse[ContentOut]:
    return BizResponse.ok(await service.retain(content_id))
