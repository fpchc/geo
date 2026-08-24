"""用户管理路由。"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import require_permission
from app.api.dependencies.services import get_user_service
from app.schemas.pagination import PaginatedResponse, PaginationParams
from app.schemas.response import BizResponse
from app.schemas.user import (
    AssignRolesRequest,
    ResetPasswordRequest,
    UserCreate,
    UserOut,
    UserQuery,
    UserUpdate,
)
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["system:user"])


@router.get(
    "",
    summary="用户分页列表",
    dependencies=[Depends(require_permission("system:user:list"))],
)
async def list_users(
    query: UserQuery = Depends(),
    page: PaginationParams = Depends(),
    service: UserService = Depends(get_user_service),
) -> BizResponse[PaginatedResponse[UserOut]]:
    items, total = await service.paginate(query, page)
    return BizResponse.ok(PaginatedResponse.build(items, total, page))


@router.get(
    "/{user_id}",
    summary="用户详情",
    dependencies=[Depends(require_permission("system:user:query"))],
)
async def get_user(
    user_id: int,
    service: UserService = Depends(get_user_service),
) -> BizResponse[UserOut]:
    return BizResponse.ok(await service.get(user_id))


@router.post(
    "",
    summary="创建用户",
    description="创建用户。可选携带 X-Idempotency-Key 以防重复提交。",
    dependencies=[Depends(require_permission("system:user:create"))],
)
async def create_user(
    body: UserCreate,
    service: UserService = Depends(get_user_service),
) -> BizResponse[UserOut]:
    return BizResponse.ok(await service.create(body))


@router.put(
    "/{user_id}",
    summary="更新用户",
    dependencies=[Depends(require_permission("system:user:update"))],
)
async def update_user(
    user_id: int,
    body: UserUpdate,
    service: UserService = Depends(get_user_service),
) -> BizResponse[UserOut]:
    return BizResponse.ok(await service.update(user_id, body))


@router.delete(
    "/{user_id}",
    summary="删除用户",
    dependencies=[Depends(require_permission("system:user:delete"))],
)
async def delete_user(
    user_id: int,
    service: UserService = Depends(get_user_service),
) -> BizResponse[None]:
    await service.delete(user_id)
    return BizResponse.ok(None, message="删除成功")


@router.put(
    "/{user_id}/password",
    summary="重置用户密码",
    dependencies=[Depends(require_permission("system:user:resetpwd"))],
)
async def reset_password(
    user_id: int,
    body: ResetPasswordRequest,
    service: UserService = Depends(get_user_service),
) -> BizResponse[None]:
    await service.reset_password(user_id, body.new_password)
    return BizResponse.ok(None, message="密码已重置")


@router.put(
    "/{user_id}/roles",
    summary="分配用户角色",
    dependencies=[Depends(require_permission("system:user:assign"))],
)
async def assign_roles(
    user_id: int,
    body: AssignRolesRequest,
    service: UserService = Depends(get_user_service),
) -> BizResponse[UserOut]:
    return BizResponse.ok(await service.assign_roles(user_id, body.role_ids))
