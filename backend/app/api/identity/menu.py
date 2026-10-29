"""菜单管理路由。"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import get_current_user, require_permission
from app.api.dependencies.services import get_menu_service
from app.core.context import CurrentUser
from app.schemas.menu import MenuCreate, MenuOut, MenuTreeNode, MenuUpdate
from app.schemas.response import BizResponse
from app.services.menu_service import MenuService

router = APIRouter(prefix="/menus", tags=["system:menu"])


@router.get(
    "/tree",
    summary="当前用户导航菜单树（剔除按钮）",
    dependencies=[Depends(get_current_user)],
)
async def nav_tree(
    current: CurrentUser = Depends(get_current_user),
    service: MenuService = Depends(get_menu_service),
) -> BizResponse[list[MenuTreeNode]]:
    return BizResponse.ok(
        await service.nav_tree(role_ids=current.role_ids, is_superuser=current.is_superuser)
    )


@router.get(
    "/tree/all",
    summary="授权菜单树（全量）",
    dependencies=[Depends(require_permission("system:menu:list"))],
)
async def full_tree(
    service: MenuService = Depends(get_menu_service),
) -> BizResponse[list[MenuTreeNode]]:
    return BizResponse.ok(await service.full_tree())


@router.get(
    "/{menu_id}",
    summary="菜单详情",
    dependencies=[Depends(require_permission("system:menu:query"))],
)
async def get_menu(
    menu_id: int,
    service: MenuService = Depends(get_menu_service),
) -> BizResponse[MenuOut]:
    return BizResponse.ok(await service.get(menu_id))


@router.post(
    "",
    summary="创建菜单",
    description="创建菜单。可选携带 X-Idempotency-Key 以防重复提交。",
    dependencies=[Depends(require_permission("system:menu:create"))],
)
async def create_menu(
    body: MenuCreate,
    service: MenuService = Depends(get_menu_service),
) -> BizResponse[MenuOut]:
    return BizResponse.ok(await service.create(body))


@router.put(
    "/{menu_id}",
    summary="更新菜单",
    dependencies=[Depends(require_permission("system:menu:update"))],
)
async def update_menu(
    menu_id: int,
    body: MenuUpdate,
    service: MenuService = Depends(get_menu_service),
) -> BizResponse[MenuOut]:
    return BizResponse.ok(await service.update(menu_id, body))


@router.delete(
    "/{menu_id}",
    summary="删除菜单",
    dependencies=[Depends(require_permission("system:menu:delete"))],
)
async def delete_menu(
    menu_id: int,
    service: MenuService = Depends(get_menu_service),
) -> BizResponse[None]:
    await service.delete(menu_id)
    return BizResponse.ok(None, message="删除成功")
