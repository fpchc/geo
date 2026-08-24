"""align content tables to POC scope (idempotent / self-healing)

背景：9acba030d523 被记入 alembic_version，但实库内容表可能从未真正建出
（历史与实库脱节）。故本迁移采用**幂等收敛**策略，用 inspector 探测实际状态：
- 超范围 5 表（content_keywords/crawl_results/publish_urls/templates/keywords）存在才 drop；
- POC 目标 6 表（agents/contents/content_versions/scores/materials/system_settings）不存在才建；
- contents 已存在（旧 9acba 真建过）则补列 regen_count/params，否则新建即自带。

无论实库处于「空」还是「已建 10 表」，upgrade head 均收敛到 POC 目标结构。

Revision ID: c7f4a1b2d3e5
Revises: b1e2c3d4a5f6
Create Date: 2026-07-27 15:10:00.000000

"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c7f4a1b2d3e5"
down_revision: str | None = "b1e2c3d4a5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _inspector() -> sa.engine.reflection.Inspector:
    return sa.inspect(op.get_bind())


def _has_table(name: str) -> bool:
    return name in _inspector().get_table_names()


def _has_column(table: str, column: str) -> bool:
    return column in {c["name"] for c in _inspector().get_columns(table)}


def upgrade() -> None:
    # ---- 1. drop 超范围表（存在才删，按外键依赖顺序）----
    for tbl in ("content_keywords", "crawl_results", "publish_urls", "templates", "keywords"):
        if _has_table(tbl):
            op.drop_table(tbl)

    # ---- 2. 建 POC 目标表（不存在才建）----
    if not _has_table("agents"):
        op.create_table(
            "agents",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("name", sa.String(length=128), nullable=False, comment="智能体名称"),
            sa.Column("icon", sa.String(length=64), nullable=True, comment="图标标识"),
            sa.Column("description", sa.String(length=512), nullable=True, comment="描述"),
            sa.Column("enabled", sa.Boolean(), nullable=False, comment="是否启用"),
            sa.Column("prompt_template", sa.Text(), nullable=True, comment="智能体基础提示词"),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("id", name=op.f("pk_agents")),
            sa.UniqueConstraint("name", name=op.f("uq_agents_name")),
        )

    if _has_table("contents"):
        # 旧 9acba 真建过：仅补 POC 新增列
        if not _has_column("contents", "regen_count"):
            op.add_column(
                "contents",
                sa.Column(
                    "regen_count",
                    sa.Integer(),
                    nullable=False,
                    server_default="0",
                    comment="重新生成次数（成功/失败均计入）",
                ),
            )
        if not _has_column("contents", "params"):
            op.add_column(
                "contents",
                sa.Column("params", sa.JSON(), nullable=True, comment="生成参数快照"),
            )
    else:
        op.create_table(
            "contents",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("agent_id", sa.BigInteger(), nullable=True, comment="关联智能体"),
            sa.Column("user_id", sa.BigInteger(), nullable=False, comment="创建用户"),
            sa.Column("current_version_id", sa.BigInteger(), nullable=True, comment="当前版本指针"),
            sa.Column("status", sa.String(length=32), nullable=False, comment="内容状态"),
            sa.Column(
                "regen_count",
                sa.Integer(),
                nullable=False,
                server_default="0",
                comment="重新生成次数（成功/失败均计入）",
            ),
            sa.Column("params", sa.JSON(), nullable=True, comment="生成参数快照"),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(
                ["agent_id"],
                ["agents.id"],
                name=op.f("fk_contents_agent_id_agents"),
                ondelete="SET NULL",
            ),
            sa.PrimaryKeyConstraint("id", name=op.f("pk_contents")),
        )
        op.create_index(op.f("ix_contents_status"), "contents", ["status"], unique=False)
        op.create_index(op.f("ix_contents_user_id"), "contents", ["user_id"], unique=False)

    if not _has_table("content_versions"):
        op.create_table(
            "content_versions",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("content_id", sa.BigInteger(), nullable=False),
            sa.Column("body", sa.Text(), nullable=False, comment="正文（markdown）"),
            sa.Column("title", sa.String(length=512), nullable=False, comment="标题"),
            sa.Column("word_count", sa.Integer(), nullable=False, comment="字数"),
            sa.Column("source_type", sa.String(length=32), nullable=False, comment="版本来源"),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(
                ["content_id"],
                ["contents.id"],
                name=op.f("fk_content_versions_content_id_contents"),
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id", name=op.f("pk_content_versions")),
        )
        op.create_index(
            op.f("ix_content_versions_content_id"), "content_versions", ["content_id"], unique=False
        )

    if not _has_table("scores"):
        op.create_table(
            "scores",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("content_id", sa.BigInteger(), nullable=False),
            sa.Column("version_id", sa.BigInteger(), nullable=True, comment="关联版本"),
            sa.Column("overall_score", sa.Float(), nullable=False, comment="综合分"),
            sa.Column("grade", sa.String(length=32), nullable=False, comment="等级"),
            sa.Column("dimensions", sa.JSON(), nullable=False, comment="维度明细"),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(
                ["content_id"],
                ["contents.id"],
                name=op.f("fk_scores_content_id_contents"),
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["version_id"],
                ["content_versions.id"],
                name=op.f("fk_scores_version_id_content_versions"),
                ondelete="SET NULL",
            ),
            sa.PrimaryKeyConstraint("id", name=op.f("pk_scores")),
        )
        op.create_index(op.f("ix_scores_content_id"), "scores", ["content_id"], unique=False)

    if not _has_table("materials"):
        op.create_table(
            "materials",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("user_id", sa.BigInteger(), nullable=False, comment="上传用户"),
            sa.Column("filename", sa.String(length=255), nullable=False, comment="原始文件名"),
            sa.Column("content_text", sa.Text(), nullable=False, comment="解析后文本"),
            sa.Column("object_key", sa.String(length=512), nullable=False, comment="对象存储 key"),
            sa.Column("file_type", sa.String(length=32), nullable=False, comment="文件类型"),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("id", name=op.f("pk_materials")),
        )
        op.create_index(op.f("ix_materials_user_id"), "materials", ["user_id"], unique=False)

    if not _has_table("system_settings"):
        op.create_table(
            "system_settings",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("key", sa.String(length=128), nullable=False, comment="配置键"),
            sa.Column("value", sa.JSON(), nullable=False, comment="配置值（JSON）"),
            sa.Column("description", sa.String(length=512), nullable=True, comment="配置说明"),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("id", name=op.f("pk_system_settings")),
            sa.UniqueConstraint("key", name=op.f("uq_system_settings_key")),
        )


def downgrade() -> None:
    # 回滚：drop POC 目标表（存在才删，按外键依赖逆序）
    for tbl in ("system_settings", "materials", "scores", "content_versions", "contents", "agents"):
        if _has_table(tbl):
            op.drop_table(tbl)
