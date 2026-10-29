"""Dashboard 聚合服务。"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, time, timedelta
from statistics import mean

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.content import Content, ContentStatus, Score
from app.repositories.dashboard_repo import DashboardRepository
from app.schemas.dashboard import (
    DashboardKeywordCoverage,
    DashboardKpis,
    DashboardOverview,
    DashboardQuery,
    DashboardRange,
    DashboardScoreBucket,
    DashboardStatusItem,
    DashboardTrendPoint,
    DashboardTrends,
)


class DashboardService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = DashboardRepository(session)

    @staticmethod
    def _range(query: DashboardQuery) -> tuple[datetime, datetime]:
        start = datetime.combine(query.from_, time.min)
        end = datetime.combine(query.to + timedelta(days=1), time.min)
        return start, end

    async def _load(self, query: DashboardQuery) -> tuple[list[Content], list[Score]]:
        start, end = self._range(query)
        contents = await self.repository.contents_in_range(start, end, query.agent_id)
        scores = await self.repository.scores_for_contents([content.id for content in contents])
        return contents, scores

    @staticmethod
    def _latest_scores(scores: list[Score]) -> dict[int, Score]:
        latest: dict[int, Score] = {}
        for score in scores:
            current = latest.get(score.content_id)
            if current is None or score.id > current.id:
                latest[score.content_id] = score
        return latest

    @staticmethod
    def _coverage_rate(score: Score | None) -> float:
        if score is None:
            return 0.0
        for dimension in score.dimensions:
            name = str(dimension.get("name", ""))
            if "关键词" in name or "keyword" in name.lower():
                return max(0.0, min(100.0, float(dimension.get("score", 0.0)))) / 100.0
        return 0.0

    @staticmethod
    def _score_bucket(value: float) -> str:
        if value < 60:
            return "0-59"
        if value < 70:
            return "60-69"
        if value < 80:
            return "70-79"
        if value < 90:
            return "80-89"
        return "90-100"

    async def overview(self, query: DashboardQuery) -> DashboardOverview:
        contents, scores = await self._load(query)
        latest = self._latest_scores(scores)
        total = len(contents)
        successful = sum(1 for content in contents if content.current_version_id is not None)
        latest_scores = list(latest.values())
        average_score = (
            mean(score.overall_score for score in latest_scores) if latest_scores else None
        )
        coverage_rate = (
            mean([self._coverage_rate(latest.get(content.id)) for content in contents])
            if contents
            else 0.0
        )
        keyword_total = sum(
            len(content.params.get("keywords", []))
            for content in contents
            if isinstance(content.params, dict)
        )
        status_counts = Counter(content.status for content in contents)
        bucket_counts = Counter(self._score_bucket(score.overall_score) for score in latest_scores)

        return DashboardOverview(
            kpis=DashboardKpis(
                content_count=total,
                generation_success_rate=successful / total if total else 0.0,
                average_score=round(average_score, 1) if average_score is not None else None,
                keyword_coverage_rate=coverage_rate,
            ),
            status_distribution=[
                DashboardStatusItem(status=status, count=count)
                for status, count in sorted(
                    status_counts.items(), key=lambda item: (-item[1], item[0])
                )
            ],
            score_distribution=[
                DashboardScoreBucket(bucket=bucket, count=bucket_counts.get(bucket, 0))
                for bucket in ("0-59", "60-69", "70-79", "80-89", "90-100")
            ],
            keyword_coverage=DashboardKeywordCoverage(
                covered=round(coverage_rate * keyword_total),
                total=keyword_total,
            ),
            timezone=settings.dashboard_timezone,
            range=DashboardRange.model_validate({"from": query.from_, "to": query.to}),
        )

    async def trends(self, query: DashboardQuery) -> DashboardTrends:
        contents, _ = await self._load(query)
        grouped: dict[str, list[Content]] = defaultdict(list)
        for content in contents:
            grouped[content.created_at.date().isoformat()].append(content)

        points = [
            DashboardTrendPoint(
                date=day,
                content_count=len(items),
                failures=sum(1 for item in items if item.status == ContentStatus.GENERATE_FAILED),
                regenerations=sum(max(0, item.regen_count - 1) for item in items),
                retained=sum(1 for item in items if item.status == ContentStatus.RETAINED),
            )
            for day, items in sorted(grouped.items())
        ]
        return DashboardTrends(points=points, timezone=settings.dashboard_timezone)
