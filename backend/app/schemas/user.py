"""用户 Schema：创建 / 更新 / 输出 / 查询 / 分配角色 / 改密。"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=6, max_length=128)
    nickname: str | None = Field(default=None, max_length=64)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=32)
    is_active: bool = True
    is_superuser: bool = False
    role_ids: list[int] = Field(default_factory=list)


class UserUpdate(BaseModel):
    nickname: str | None = Field(default=None, max_length=64)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=32)
    is_active: bool | None = None
    is_superuser: bool | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    nickname: str | None
    email: str | None
    phone: str | None
    is_active: bool
    is_superuser: bool
    role_ids: list[int] = Field(default_factory=list)


class UserQuery(BaseModel):
    username: str | None = None
    is_active: bool | None = None


class AssignRolesRequest(BaseModel):
    role_ids: list[int] = Field(default_factory=list)


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=6, max_length=128)
