"""drop permission tables (menu button perm_code is the single source)

Revision ID: b1e2c3d4a5f6
Revises: 9acba030d523
Create Date: 2026-07-25 09:30:00.000000

权限模型调整：移除独立 Permission 表与 role_permission 关联表。
权限码唯一来源改为菜单按钮节点（menus.type=BUTTON）的 perm_code，
用户经「角色 → role_menu → 按钮 perm_code」聚合权限码，不再有角色-权限直连。
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b1e2c3d4a5f6"
down_revision: str | None = "9acba030d523"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 先删关联表（含指向 permissions 的外键），再删主表
    op.drop_table("role_permission")
    op.drop_index(op.f("ix_permissions_deprecated"), table_name="permissions")
    op.drop_index(op.f("ix_permissions_code"), table_name="permissions")
    op.drop_table("permissions")


def downgrade() -> None:
    # 回滚：重建 permissions 主表与 role_permission 关联表
    op.create_table(
        "permissions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("code", sa.String(length=128), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("module", sa.String(length=64), nullable=False),
        sa.Column("resource", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("deprecated", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_permissions")),
    )
    op.create_index(op.f("ix_permissions_code"), "permissions", ["code"], unique=True)
    op.create_index(op.f("ix_permissions_deprecated"), "permissions", ["deprecated"], unique=False)
    op.create_table(
        "role_permission",
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("permission_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["permission_id"],
            ["permissions.id"],
            name=op.f("fk_role_permission_permission_id_permissions"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["role_id"],
            ["roles.id"],
            name=op.f("fk_role_permission_role_id_roles"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("role_id", "permission_id", name=op.f("pk_role_permission")),
    )
