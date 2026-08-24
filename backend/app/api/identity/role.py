"""角色管理路由。"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import require_permission
from app.api.dependencies.services import get_role_service
from app.schemas.pagination import PaginatedResponse, PaginationParams
from app.schemas.response import BizResponse
from app.schemas.role import (
    AssignMenusRequest,
    RoleCreate,
    RoleOut,
    RoleQuery,
    RoleUpdate,
)
from app.services.role_service import RoleService

router = APIRouter(prefix="/roles", tags=["system:role"])


@router.get(
    "",
    summary="角色分页列表",
    dependencies=[Depends(require_permission("system:role:list"))],
)
async def list_roles(
    query: RoleQuery = Depends(),
    page: PaginationParams = Depends(),
    service: RoleService = Depends(get_role_service),
) -> BizResponse[PaginatedResponse[RoleOut]]:
    items, total = await service.paginate(query, page)
    return BizResponse.ok(PaginatedResponse.build(items, total, page))


@router.get(
    "/{role_id}",
    summary="角色详情",
    dependencies=[Depends(require_permission("system:role:query"))],
)
async def get_role(
    role_id: int,
    service: RoleService = Depends(get_role_service),
) -> BizResponse[RoleOut]:
    return BizResponse.ok(await service.get(role_id))


@router.post(
    "",
    summary="创建角色",
    description="创建角色。可选携带 X-Idempotency-Key 以防重复提交。",
    dependencies=[Depends(require_permission("system:role:create"))],
)
async def create_role(
    body: RoleCreate,
    service: RoleService = Depends(get_role_service),
) -> BizResponse[RoleOut]:
    return BizResponse.ok(await service.create(body))


@router.put(
    "/{role_id}",
    summary="更新角色",
    dependencies=[Depends(require_permission("system:role:update"))],
)
async def update_role(
    role_id: int,
    body: RoleUpdate,
    service: RoleService = Depends(get_role_service),
) -> BizResponse[RoleOut]:
    return BizResponse.ok(await service.update(role_id, body))


@router.delete(
    "/{role_id}",
    summary="删除角色",
    dependencies=[Depends(require_permission("system:role:delete"))],
)
async def delete_role(
    role_id: int,
    service: RoleService = Depends(get_role_service),
) -> BizResponse[None]:
    await service.delete(role_id)
    return BizResponse.ok(None, message="删除成功")


@router.put(
    "/{role_id}/menus",
    summary="分配角色菜单",
    description="为角色分配授权菜单；角色权限码 = 所授权菜单中按钮节点的 perm_code 集合。",
    dependencies=[Depends(require_permission("system:role:assign"))],
)
async def assign_menus(
    role_id: int,
    body: AssignMenusRequest,
    service: RoleService = Depends(get_role_service),
) -> BizResponse[RoleOut]:
    return BizResponse.ok(await service.assign_menus(role_id, body.menu_ids))
