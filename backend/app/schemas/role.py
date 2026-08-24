"""角色 Schema：创建 / 更新 / 输出 / 分配菜单与权限。"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class RoleCreate(BaseModel):
    code: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=128)
    description: str | None = Field(default=None, max_length=255)
    menu_ids: list[int] = Field(default_factory=list)


class RoleUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=128)
    description: str | None = Field(default=None, max_length=255)


class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    description: str | None
    menu_ids: list[int] = Field(default_factory=list)


class RoleQuery(BaseModel):
    code: str | None = None
    name: str | None = None


class AssignMenusRequest(BaseModel):
    menu_ids: list[int] = Field(default_factory=list)
