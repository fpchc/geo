"""菜单 Schema：创建 / 更新 / 输出 / 树节点。"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.models.rbac import MenuType


class MenuCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    type: MenuType = MenuType.MENU
    parent_id: int = Field(default=0, ge=0)
    path: str = Field(default="", max_length=255)
    icon: str | None = Field(default=None, max_length=64)
    perm_code: str | None = Field(default=None, max_length=128)
    order_no: int = 0
    visible: bool = True


class MenuUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=128)
    type: MenuType | None = None
    parent_id: int | None = Field(default=None, ge=0)
    path: str | None = Field(default=None, max_length=255)
    icon: str | None = Field(default=None, max_length=64)
    perm_code: str | None = Field(default=None, max_length=128)
    order_no: int | None = None
    visible: bool | None = None


class MenuOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: int
    parent_id: int
    ancestors: str
    path: str
    icon: str | None
    perm_code: str | None
    order_no: int
    visible: bool


class MenuTreeNode(MenuOut):
    children: list[MenuTreeNode] = Field(default_factory=list)
