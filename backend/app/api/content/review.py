"""评审路由（F-11 关键词评审 + 出分）。

评审为外部大模型调用，挂 require_idempotency_key。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import require_permission
from app.api.dependencies.services import get_review_service
from app.core.idempotency import require_idempotency_key
from app.schemas.content import ScoreOut
from app.schemas.response import BizResponse
from app.services.content.review_service import ReviewService

router = APIRouter(prefix="/content/contents", tags=["content:review"])


@router.post(
    "/{content_id}/review",
    summary="关键词评审并出分",
    description="评审智能体审核关键词覆盖并打分。需携带 X-Idempotency-Key。",
    dependencies=[
        Depends(require_permission("content:review:score")),
        # Depends(require_idempotency_key),
    ],
)
async def review_content(
    content_id: int,
    service: ReviewService = Depends(get_review_service),
) -> BizResponse[ScoreOut]:
    return BizResponse.ok(await service.review(content_id))


@router.get(
    "/{content_id}/score",
    summary="查询最新评分",
    dependencies=[Depends(require_permission("content:review:query"))],
)
async def get_latest_score(
    content_id: int,
    service: ReviewService = Depends(get_review_service),
) -> BizResponse[ScoreOut]:
    return BizResponse.ok(await service.latest(content_id))
