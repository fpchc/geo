"""爬虫 / 命中验证 Provider（CrawlerProvider 实现）。

封装到搜索引擎检索、判断"发布 URL 是否出现在搜索结果"的命中验证调用。
- 外呼类调用，需限速与反爬容错（限速参数见 settings.crawler_rate_limit_per_second）。
- 命中判据（精确 / 模糊）待需求方确认（Q1），当前先透传下游返回。
- 继承 HttpProvider 复用 httpx.AsyncClient 与 Trace ID 注入。
"""

from __future__ import annotations

from app.core.config import settings
from app.core.exceptions import CrawlerException, ProviderException
from app.providers.http_provider import HttpProvider
from app.providers.types import SearchHit

_SEARCH_PATH = "/search"


class HttpCrawlerProvider(HttpProvider):
    """基于 HTTP 检索服务的爬虫实现。"""

    async def search(self, keyword: str, engine: str) -> list[SearchHit]:
        """按关键词在指定搜索引擎检索，返回命中结果列表。"""
        try:
            data = await self.request_json(
                "GET",
                _SEARCH_PATH,
                params={"q": keyword, "engine": engine},
            )
        except ProviderException as exc:
            raise CrawlerException(str(exc)) from exc

        results: list[SearchHit] = []
        for item in data.get("results", []):
            results.append(
                SearchHit(
                    keyword=keyword,
                    search_engine=engine,
                    hit=bool(item.get("hit", False)),
                    matched_url=item.get("matchedUrl"),
                    rank=item.get("rank"),
                )
            )
        return results


class MockCrawlerProvider:
    """内存 Mock 爬虫实现，用于本地或测试环境。"""

    async def search(self, keyword: str, engine: str) -> list[SearchHit]:
        return [
            SearchHit(
                keyword=keyword,
                search_engine=engine,
                hit=True,
                matched_url="https://example.com/mock-article",
                rank=1,
            )
        ]

    async def aclose(self) -> None:
        return None


def build_crawler_provider() -> HttpCrawlerProvider | MockCrawlerProvider:
    """根据配置构建爬虫 Provider（运行时切换）。"""
    if settings.crawler_backend == "http":
        return HttpCrawlerProvider(
            base_url=settings.crawler_base_url,
            timeout=settings.crawler_timeout_seconds,
        )
    return MockCrawlerProvider()
