"""Dashboard 聚合服务单元测试（无 DB）。"""

from __future__ import annotations

import asyncio
from datetime import date, datetime
from types import SimpleNamespace

from app.schemas.dashboard import DashboardQuery
from app.services.dashboard_service import DashboardService


class FakeDashboardRepository:
    def __init__(self, contents: list[SimpleNamespace], scores: list[SimpleNamespace]) -> None:
        self.contents = contents
        self.scores = scores

    async def contents_in_range(
        self, start: datetime, end: datetime, agent_id: int | None
    ) -> list[SimpleNamespace]:
        return self.contents

    async def scores_for_contents(self, content_ids: list[int]) -> list[SimpleNamespace]:
        return self.scores


def make_content(
    content_id: int,
    *,
    status: str,
    regen_count: int,
    keywords: list[str],
    created_at: datetime,
) -> SimpleNamespace:
    return SimpleNamespace(
        id=content_id,
        current_version_id=content_id * 10,
        status=status,
        regen_count=regen_count,
        params={"keywords": keywords},
        created_at=created_at,
    )


def make_score(content_id: int, score: float, coverage: float) -> SimpleNamespace:
    return SimpleNamespace(
        id=content_id,
        content_id=content_id,
        overall_score=score,
        dimensions=[{"name": "Keyword coverage", "score": coverage}],
    )


def test_dashboard_overview_aggregates_kpis_and_distributions() -> None:
    contents = [
        make_content(
            1,
            status="generated",
            regen_count=1,
            keywords=["geo", "ai"],
            created_at=datetime(2026, 10, 20, 9, 0),
        ),
        make_content(
            2,
            status="retained",
            regen_count=3,
            keywords=["content"],
            created_at=datetime(2026, 10, 21, 9, 0),
        ),
    ]
    scores = [make_score(1, 80, 50), make_score(2, 90, 100)]
    service = object.__new__(DashboardService)
    service.repository = FakeDashboardRepository(contents, scores)

    query = DashboardQuery.model_validate({"from": date(2026, 10, 1), "to": date(2026, 10, 31)})
    overview = asyncio.run(service.overview(query))

    assert overview.kpis.content_count == 2
    assert overview.kpis.generation_success_rate == 1.0
    assert overview.kpis.average_score == 85.0
    assert overview.kpis.keyword_coverage_rate == 0.75
    assert overview.keyword_coverage.total == 3
    assert overview.keyword_coverage.covered == 2
    assert {item.status for item in overview.status_distribution} == {"generated", "retained"}


def test_dashboard_trends_groups_by_day() -> None:
    contents = [
        make_content(
            1,
            status="generated",
            regen_count=1,
            keywords=[],
            created_at=datetime(2026, 10, 20, 9, 0),
        ),
        make_content(
            2,
            status="retained",
            regen_count=3,
            keywords=[],
            created_at=datetime(2026, 10, 20, 10, 0),
        ),
    ]
    service = object.__new__(DashboardService)
    service.repository = FakeDashboardRepository(contents, [])

    query = DashboardQuery.model_validate({"from": date(2026, 10, 1), "to": date(2026, 10, 31)})
    trends = asyncio.run(service.trends(query))

    assert len(trends.points) == 1
    assert trends.points[0].date == "2026-10-20"
    assert trends.points[0].content_count == 2
    assert trends.points[0].regenerations == 2
    assert trends.points[0].retained == 1
