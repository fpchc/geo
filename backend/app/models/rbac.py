"""RBAC 模型：User / Role / Menu + 两张关联表。

关系：
- user_role : User ↔ Role
- role_menu : Role ↔ Menu

权限模型：无独立 Permission 表。权限码唯一来源为菜单按钮节点（Menu.type=BUTTON）
的 perm_code；用户经由「角色 → 授权菜单 → 按钮 perm_code」聚合出权限码集合。
"""

from __future__ import annotations

from enum import IntEnum

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    ForeignKey,
    Integer,
    String,
    Table,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class MenuType(IntEnum):
    """菜单节点类型。"""

    DIRECTORY = 0  # 目录：折叠容器，无路由
    MENU = 1  # 菜单：对应前端页面路由
    BUTTON = 2  # 按钮：挂在菜单下的操作节点，携带 perm_code


# ---- 关联表 ----
user_role = Table(
    "user_role",
    Base.metadata,
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)

role_menu = Table(
    "role_menu",
    Base.metadata,
    Column("role_id", ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("menu_id", ForeignKey("menus.id", ondelete="CASCADE"), primary_key=True),
)


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    nickname: Mapped[str | None] = mapped_column(String(64), default=None)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, default=None)
    phone: Mapped[str | None] = mapped_column(String(32), default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)

    roles: Mapped[list[Role]] = relationship(
        secondary=user_role,
        back_populates="users",
        lazy="selectin",
    )
    # 权限码聚合已下沉到 app.core.security.permission_cache（走 Redis 缓存），
    # 数据访问在 MenuRepository；模型层不再承载 SQLAlchemy 查询。


class Role(TimestampMixin, Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    description: Mapped[str | None] = mapped_column(String(255), default=None)

    users: Mapped[list[User]] = relationship(
        secondary=user_role,
        back_populates="roles",
    )
    menus: Mapped[list[Menu]] = relationship(
        secondary=role_menu,
        back_populates="roles",
    )


class Menu(TimestampMixin, Base):
    __tablename__ = "menus"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128))
    # 节点类型：0 目录 / 1 菜单 / 2 按钮
    type: Mapped[int] = mapped_column(Integer, default=MenuType.MENU, index=True)
    # 顶级节点 parent_id = 0（虚拟根），禁用 NULL；无自引用外键（0 非真实行）
    parent_id: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0, index=True)
    # 逗号分隔的祖先 ID（不含自身），如节点 5 为 "0,1"；子树查询用 LIKE 'x,%' 带尾分隔符
    ancestors: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    path: Mapped[str] = mapped_column(String(255), default="")
    icon: Mapped[str | None] = mapped_column(String(64), default=None)
    # 按钮节点关联的权限码（三段式），目录/菜单可为空
    perm_code: Mapped[str | None] = mapped_column(String(128), default=None)
    order_no: Mapped[int] = mapped_column(Integer, default=0)
    visible: Mapped[bool] = mapped_column(Boolean, default=True)

    roles: Mapped[list[Role]] = relationship(
        secondary=role_menu,
        back_populates="menus",
    )
