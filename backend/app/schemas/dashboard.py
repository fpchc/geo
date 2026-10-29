"""Dashboard 聚合 Schema。"""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class DashboardQuery(BaseModel):
    from_: date = Field(alias="from")
    to: date
    agent_id: int | None = None


class DashboardKpis(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    content_count: int = Field(alias="contentCount")
    generation_success_rate: float = Field(alias="generationSuccessRate")
    average_score: float | None = Field(alias="averageScore")
    keyword_coverage_rate: float = Field(alias="keywordCoverageRate")


class DashboardStatusItem(BaseModel):
    status: str
    count: int


class DashboardScoreBucket(BaseModel):
    bucket: str
    count: int


class DashboardKeywordCoverage(BaseModel):
    covered: int
    total: int


class DashboardRange(BaseModel):
    from_: date = Field(alias="from")
    to: date


class DashboardOverview(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    kpis: DashboardKpis
    status_distribution: list[DashboardStatusItem] = Field(alias="statusDistribution")
    score_distribution: list[DashboardScoreBucket] = Field(alias="scoreDistribution")
    keyword_coverage: DashboardKeywordCoverage = Field(alias="keywordCoverage")
    timezone: str
    range: DashboardRange


class DashboardTrendPoint(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    date: str
    content_count: int = Field(alias="contentCount")
    failures: int
    regenerations: int
    retained: int


class DashboardTrends(BaseModel):
    points: list[DashboardTrendPoint]
    timezone: str
