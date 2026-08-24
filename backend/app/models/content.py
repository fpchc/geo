"""内容生产模型（POC 范围）。

表清单（对齐迁移 9acba030d523 + c7f4a1b2d3e5）：
- agents            7 个创作智能体（种子见 scripts/agent_seed.py）
- contents          单篇内容主体（状态机 + 重新生成计数 + 生成参数快照）
- content_versions  内容版本（每次生成产出一版 markdown 正文）
- scores            关键词评审评分（7 维明细 + 综合分）
- materials         上传资料（解析后全文，供 prompt 注入）
- system_settings   后台可配 KV（默认提示词 F-06 / 评分规则 F-12）

状态机（见流程图与状态机.md）：
    configuring → generating → (generate_failed | generated)
    generated  → reviewed → (generating[重新生成] | locked | retained)
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class ContentStatus(StrEnum):
    """单篇内容状态（POC 状态机口径）。"""

    CONFIGURING = "configuring"  # 参数配置中
    GENERATING = "generating"  # 生成中（后台任务运行）
    GENERATE_FAILED = "generate_failed"  # 生成失败（可重试，计入次数）
    GENERATED = "generated"  # 已生成待评审
    REVIEWED = "reviewed"  # 已评审
    LOCKED = "locked"  # 已锁定（重新生成达上限）
    RETAINED = "retained"  # 内容留存（用户确认）


class VersionSource(StrEnum):
    """版本来源。"""

    GENERATE = "generate"  # 首次生成 / 重新生成


class Agent(TimestampMixin, Base):
    """创作智能体（F-01）。"""

    __tablename__ = "agents"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), unique=True)
    icon: Mapped[str | None] = mapped_column(String(64), default=None)
    description: Mapped[str | None] = mapped_column(String(512), default=None)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    # 智能体基础提示词（后台可配 Q-04），生成时作为 prompt 首段注入
    prompt_template: Mapped[str | None] = mapped_column(Text, default=None)


class Content(TimestampMixin, Base):
    """单篇内容主体。"""

    __tablename__ = "contents"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    agent_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("agents.id", ondelete="SET NULL"), default=None
    )
    user_id: Mapped[int] = mapped_column(BigInteger, index=True)
    # 当前版本指针；循环外键（↔ content_versions）由迁移用 ALTER 添加，模型侧不声明 FK
    current_version_id: Mapped[int | None] = mapped_column(BigInteger, default=None)
    status: Mapped[str] = mapped_column(String(32), default=ContentStatus.CONFIGURING, index=True)
    # 重新生成计数（F-13）：成功/失败均计入，达 settings.content_regen_limit 锁定
    regen_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    # 生成参数快照（F-02~F-05）：受众/平台/行业/角度/字数/关键词/额外提示词/资料ID
    params: Mapped[dict[str, Any] | None] = mapped_column(JSON, default=None)


class ContentVersion(TimestampMixin, Base):
    """内容版本：每次生成产出一版 markdown 正文。"""

    __tablename__ = "content_versions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    content_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("contents.id", ondelete="CASCADE"), index=True
    )
    body: Mapped[str] = mapped_column(Text)
    title: Mapped[str] = mapped_column(String(512))
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    source_type: Mapped[str] = mapped_column(String(32), default=VersionSource.GENERATE)


class Score(TimestampMixin, Base):
    """关键词评审评分（F-11）。"""

    __tablename__ = "scores"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    content_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("contents.id", ondelete="CASCADE"), index=True
    )
    version_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("content_versions.id", ondelete="SET NULL"), default=None
    )
    overall_score: Mapped[float] = mapped_column(Float)
    grade: Mapped[str] = mapped_column(String(32))
    # 维度明细：list[{name, score, weight, detail}]（含关键词覆盖率维度）
    dimensions: Mapped[list[dict[str, Any]]] = mapped_column(JSON)


class Material(TimestampMixin, Base):
    """上传资料（F-07）：解析后全文注入 prompt。"""

    __tablename__ = "materials"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, index=True)
    filename: Mapped[str] = mapped_column(String(255))
    # 解析后的纯文本内容（txt/md 直读，pdf/docx 抽取）
    content_text: Mapped[str] = mapped_column(Text)
    object_key: Mapped[str] = mapped_column(String(512))
    file_type: Mapped[str] = mapped_column(String(32))


class SystemSetting(TimestampMixin, Base):
    """后台可配 KV：默认提示词（F-06）/ 评分规则（F-12）。"""

    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(128), unique=True)
    value: Mapped[Any] = mapped_column(JSON)
    description: Mapped[str | None] = mapped_column(String(512), default=None)
