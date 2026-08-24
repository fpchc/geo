"""系统配置路由（F-06 默认提示词 / F-12 评分规则，仅后台可改）。"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import require_permission
from app.api.dependencies.services import get_setting_service
from app.schemas.content import SettingOut, SettingUpdate
from app.schemas.response import BizResponse
from app.services.content.setting_service import SettingService

router = APIRouter(prefix="/content/settings", tags=["content:setting"])


@router.get(
    "/{key}",
    summary="读取系统配置（缺省回退内置默认）",
    dependencies=[Depends(require_permission("content:setting:query"))],
)
async def get_setting(
    key: str,
    service: SettingService = Depends(get_setting_service),
) -> BizResponse[SettingOut]:
    return BizResponse.ok(await service.get(key))


@router.put(
    "/{key}",
    summary="更新系统配置（默认提示词 / 评分规则）",
    dependencies=[Depends(require_permission("content:setting:update"))],
)
async def update_setting(
    key: str,
    body: SettingUpdate,
    service: SettingService = Depends(get_setting_service),
) -> BizResponse[SettingOut]:
    return BizResponse.ok(await service.upsert(key, body))
