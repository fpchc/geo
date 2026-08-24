"""评审服务（F-11 关键词评审 + F-12 评分规则）。

评审智能体对当前版本正文做关键词覆盖审核并出分：
- 关键词取自内容生成参数快照（与生成端同一套关键词，保证一致性）。
- 评分规则从 system_settings 读取（后台可配，本期不固化分值/及格线）。
- 评分为固定低温度调用（provider 内 score 已用 score_temperature），结果落 scores 表。
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.core.providers import LLMProvider
from app.models.content import ContentStatus, Score
from app.repositories.content_repo import (
    ContentRepository,
    ScoreRepository,
    VersionRepository,
)
from app.schemas.content import ScoreOut
from app.services.content.prompt_builder import build_review_prompt
from app.services.content.setting_service import SettingService


class ReviewService:
    def __init__(self, session: AsyncSession, llm: LLMProvider) -> None:
        self.session = session
        self.llm = llm
        self.contents = ContentRepository(session)
        self.versions = VersionRepository(session)
        self.scores = ScoreRepository(session)
        self.settings_svc = SettingService(session)

    async def review(self, content_id: int) -> ScoreOut:
        content = await self.contents.get(content_id)
        if content is None:
            raise NotFoundException("内容不存在")
        if content.current_version_id is None:
            raise ConflictException("内容尚未生成，无法评审")

        version = await self.versions.get(content.current_version_id)
        if version is None:
            raise NotFoundException("当前版本不存在")

        params = content.params or {}
        keywords = list(params.get("keywords", []))
        scoring_rule = await self.settings_svc.get_scoring_rule()

        prompt = build_review_prompt(
            body=version.body,
            keywords=keywords,
            scoring_rule=scoring_rule,
        )
        result = await self.llm.score(prompt)

        score = Score(
            content_id=content_id,
            version_id=version.id,
            overall_score=result.overall_score,
            grade=result.grade,
            dimensions=[
                {
                    "name": d.name,
                    "score": d.score,
                    "weight": d.weight,
                    "detail": d.detail,
                }
                for d in result.dimensions
            ],
        )
        await self.scores.create(score)

        # 已生成 → 已评审
        if content.status == ContentStatus.GENERATED:
            content.status = ContentStatus.REVIEWED
            await self.session.flush()

        return ScoreOut.model_validate(score)

    async def latest(self, content_id: int) -> ScoreOut:
        score = await self.scores.latest_by_content(content_id)
        if score is None:
            raise NotFoundException("暂无评分记录")
        return ScoreOut.model_validate(score)
