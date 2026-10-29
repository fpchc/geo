"""内容生产 Schema（POC）：智能体 / 生成参数 / 版本 / 评分 / 资料 / 系统配置。"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.core.tasks.task_store import TaskStatus

# --------------------------------------------------------------------------- #
# 智能体（F-01）
# --------------------------------------------------------------------------- #


class AgentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    icon: str | None
    description: str | None
    enabled: bool


class AgentDetailOut(AgentOut):
    """含基础提示词的详情（选中智能体后载入）。"""

    prompt_template: str | None


# --------------------------------------------------------------------------- #
# 创作参数（F-02~F-05）
# --------------------------------------------------------------------------- #


class CreationParams(BaseModel):
    """创作参数：仅作为生成的风格/语气/结构约束，不触发投放逻辑。"""

    audience: str | None = Field(default=None, max_length=128, description="目标受众")
    platform: str | None = Field(default=None, max_length=128, description="发布平台")
    industry: str | None = Field(default=None, max_length=128, description="行业领域")
    angle: str | None = Field(default=None, max_length=128, description="创作角度")


class GenerateRequest(BaseModel):
    """内容生成入参（F-02~F-05, F-07）。"""

    agent_id: int = Field(description="选中的智能体（F-01）")
    params: CreationParams = Field(default_factory=CreationParams, description="创作参数")
    keywords: list[str] = Field(
        default_factory=list,
        description="关键词（原样命中 + 自然融入，同时是评审基准 F-03）",
    )
    target_word_count: int = Field(default=800, ge=1, le=100_000, description="目标字数（F-04）")
    extra_prompt: str | None = Field(
        default=None, max_length=4000, description="额外提示词（选填，不填则套用默认提示词 F-05）"
    )
    material_ids: list[int] = Field(
        default_factory=list, description="已上传资料 ID（全文注入 F-07）"
    )


class GenerateAccepted(BaseModel):
    """生成受理响应：返回内容与异步任务句柄。"""

    content_id: int
    task_id: str
    status: str
    regen_count: int


class GenerateTaskOut(BaseModel):
    """异步生成任务状态（轮询 task_id 的真实返回结构）。"""

    status: TaskStatus
    result: dict[str, Any] | None
    error: str | None


# --------------------------------------------------------------------------- #
# 内容 / 版本
# --------------------------------------------------------------------------- #


class VersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content_id: int
    title: str
    body: str
    word_count: int
    source_type: str


class ContentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str | None = None
    created_at: datetime
    updated_at: datetime
    username: str | None = None
    agent_id: int | None
    user_id: int
    status: str
    regen_count: int
    current_version_id: int | None
    params: dict[str, Any] | None


class ContentDetailOut(ContentOut):
    """内容详情：附带当前版本正文（md 预览 F-10）。"""

    current_version: VersionOut | None = None


class ContentQuery(BaseModel):
    status: str | None = None
    agent_id: int | None = None
    keyword: str | None = Field(default=None, max_length=128)


# --------------------------------------------------------------------------- #
# 评分（F-11 / F-12）
# --------------------------------------------------------------------------- #


class ScoreDimensionOut(BaseModel):
    name: str
    score: float
    weight: float
    detail: str


class ScoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content_id: int
    version_id: int | None
    overall_score: float
    grade: str
    dimensions: list[ScoreDimensionOut]


# --------------------------------------------------------------------------- #
# 资料（F-07）
# --------------------------------------------------------------------------- #


class MaterialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    filename: str
    file_type: str
    object_key: str
    char_count: int = Field(description="解析后正文字符数")


# --------------------------------------------------------------------------- #
# 系统配置（F-06 默认提示词 / F-12 评分规则，后台可配）
# --------------------------------------------------------------------------- #


class SettingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key: str
    value: Any
    description: str | None


class SettingUpdate(BaseModel):
    value: Any = Field(description="配置值（JSON）")
    description: str | None = Field(default=None, max_length=512)
