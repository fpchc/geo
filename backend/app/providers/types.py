"""Provider 层通用数据结构。

放置各 Provider 返回的结果对象，供具体实现与 core.providers 的
Protocol 契约共同引用，避免循环导入。
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class LLMResult:
    """大模型文本生成 / 优化结果。"""

    body: str
    title_options: list[str] = field(default_factory=list)
    word_count: int = 0


@dataclass(slots=True)
class ScoreDimension:
    """GEO 评分单维度明细。"""

    name: str
    score: float
    weight: float
    detail: str


@dataclass(slots=True)
class ScoreResult:
    """GEO 评分结果（7 维 + 综合分）。"""

    overall_score: float
    grade: str
    dimensions: list[ScoreDimension] = field(default_factory=list)


@dataclass(slots=True)
class SearchHit:
    """搜索引擎命中结果。"""

    keyword: str
    search_engine: str
    hit: bool
    matched_url: str | None = None
    rank: int | None = None
