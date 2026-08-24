"""系统配置服务（F-06 默认提示词 / F-12 评分规则，后台可配）。

配置以 KV 形式存 system_settings；缺省时回退内置默认值（首版占位，后台可改）。
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.repositories.content_repo import SettingRepository
from app.schemas.content import SettingOut, SettingUpdate

# 配置键（集中登记，禁止散落硬编码）
KEY_DEFAULT_PROMPT = "content.default_prompt"
KEY_SCORING_RULE = "content.scoring_rule"

# F-06 默认提示词（首版占位，仅后台可改，前端不暴露）
_DEFAULT_PROMPT = (
    "请撰写一篇结构清晰、信息准确、可读性强的专业文章，覆盖给定关键词并自然融入语句，避免空泛套话。"
)

# F-12 评分规则默认版（以关键词覆盖率为主维度，满分 100，本期不固化及格线）
_DEFAULT_SCORING_RULE: dict[str, Any] = {
    "full_score": 100,
    "pass_line": None,  # 本期不固化及格线
    "dimensions": [
        {"name": "关键词覆盖率", "weight": 0.5, "detail": "关键词原样命中占比"},
        {"name": "内容相关性", "weight": 0.2, "detail": "与主题及关键词的相关程度"},
        {"name": "结构化程度", "weight": 0.15, "detail": "标题层级与段落组织"},
        {"name": "可读性", "weight": 0.15, "detail": "语句通顺、无堆砌"},
    ],
}


class SettingService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.settings_repo = SettingRepository(session)

    async def _get_value(self, key: str, default: Any) -> Any:
        row = await self.settings_repo.get_by_key(key)
        return row.value if row is not None else default

    async def get_default_prompt(self) -> str:
        value = await self._get_value(KEY_DEFAULT_PROMPT, _DEFAULT_PROMPT)
        return str(value)

    async def get_scoring_rule(self) -> dict[str, Any]:
        value = await self._get_value(KEY_SCORING_RULE, _DEFAULT_SCORING_RULE)
        return dict(value)

    async def get(self, key: str) -> SettingOut:
        row = await self.settings_repo.get_by_key(key)
        if row is None:
            # 回退内置默认，方便后台首次读取
            defaults = {
                KEY_DEFAULT_PROMPT: (_DEFAULT_PROMPT, "默认提示词（F-06）"),
                KEY_SCORING_RULE: (_DEFAULT_SCORING_RULE, "评分规则（F-12）"),
            }
            if key not in defaults:
                raise NotFoundException("配置项不存在")
            value, desc = defaults[key]
            return SettingOut(key=key, value=value, description=desc)
        return SettingOut(key=row.key, value=row.value, description=row.description)

    async def upsert(self, key: str, data: SettingUpdate) -> SettingOut:
        row = await self.settings_repo.get_by_key(key)
        if row is None:
            from app.models.content import SystemSetting

            row = SystemSetting(key=key, value=data.value, description=data.description)
            await self.settings_repo.create(row)
        else:
            row.value = data.value
            if data.description is not None:
                row.description = data.description
            await self.session.flush()
        return SettingOut(key=row.key, value=row.value, description=row.description)
