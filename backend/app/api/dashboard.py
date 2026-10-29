"""Dashboard 聚合路由。"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import require_permission
from app.api.dependencies.services import get_dashboard_service
from app.schemas.dashboard import DashboardOverview, DashboardQuery, DashboardTrends
from app.schemas.response import BizResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["content:dashboard"])


@router.get(
    "/overview",
    summary="工作台概览指标",
    dependencies=[Depends(require_permission("content:dashboard:read"))],
)
async def overview(
    query: DashboardQuery = Depends(),
    service: DashboardService = Depends(get_dashboard_service),
) -> BizResponse[DashboardOverview]:
    return BizResponse.ok(await service.overview(query))


@router.get(
    "/trends",
    summary="工作台趋势数据",
    dependencies=[Depends(require_permission("content:dashboard:read"))],
)
async def trends(
    query: DashboardQuery = Depends(),
    service: DashboardService = Depends(get_dashboard_service),
) -> BizResponse[DashboardTrends]:
    return BizResponse.ok(await service.trends(query))
