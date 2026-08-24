"""Provider 依赖注入注册中心。

统一约定：所有底层调用（大模型 / 对象存储 / 爬虫 / 通用下游）都封装为 Provider，
在此以 `Protocol` 定义抽象接口（mypy 可静态检查），按配置在运行时切换具体实现，
经 FastAPI `Depends` 注入 service。新增底层调用只需：
    1. 在具体实现文件（app/providers/*）写实现 + build_* 工厂；
    2. 在此登记 Protocol + get_* 依赖。
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any, Protocol, runtime_checkable

from app.core.config import settings
from app.providers.crawler_provider import build_crawler_provider
from app.providers.http_provider import HttpProvider
from app.providers.minio_provider import build_storage_provider
from app.providers.qwen_provider import build_llm_provider
from app.providers.types import LLMResult, ScoreResult, SearchHit


# --------------------------------------------------------------------------- #
# 通用下游示例 Provider（骨架保留）
# --------------------------------------------------------------------------- #
@runtime_checkable
class ExampleProvider(Protocol):
    """示例下游服务抽象接口。"""

    async def request_json(
        self,
        method: str,
        url: str,
        *,
        json: Any = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]: ...

    async def aclose(self) -> None: ...


class MockProvider:
    """内存 Mock 实现，用于本地或测试环境。"""

    async def request_json(
        self,
        method: str,
        url: str,
        *,
        json: Any = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return {"source": "mock", "method": method, "url": url}

    async def aclose(self) -> None:
        return None


def build_provider() -> ExampleProvider:
    """根据配置构建通用下游 Provider（运行时切换）。"""
    if settings.provider_backend == "http":
        return HttpProvider(
            base_url=settings.provider_base_url,
            timeout=settings.provider_timeout_seconds,
        )
    return MockProvider()


async def get_example_provider() -> AsyncGenerator[ExampleProvider]:
    """FastAPI 依赖：注入通用下游 Provider，请求结束后关闭连接。"""
    provider = build_provider()
    try:
        yield provider
    finally:
        await provider.aclose()


# --------------------------------------------------------------------------- #
# 大模型 Provider（Qwen 生成 / 优化 / 评分）
# --------------------------------------------------------------------------- #
@runtime_checkable
class LLMProvider(Protocol):
    """大模型抽象接口。"""

    async def generate(self, prompt: str) -> LLMResult: ...

    async def optimize(self, prompt: str) -> LLMResult: ...

    async def score(self, prompt: str) -> ScoreResult: ...

    async def aclose(self) -> None: ...


async def get_llm_provider() -> AsyncGenerator[LLMProvider]:
    """FastAPI 依赖：注入大模型 Provider，请求结束后关闭连接。"""
    provider = build_llm_provider()
    try:
        yield provider
    finally:
        await provider.aclose()


# --------------------------------------------------------------------------- #
# 对象存储 Provider（MinIO）
# --------------------------------------------------------------------------- #
@runtime_checkable
class StorageProvider(Protocol):
    """对象存储抽象接口。"""

    async def upload(self, key: str, data: bytes, content_type: str) -> str: ...

    async def download(self, key: str) -> bytes: ...

    async def presigned_url(self, key: str, expires: int | None = None) -> str: ...

    async def aclose(self) -> None: ...


async def get_storage_provider() -> AsyncGenerator[StorageProvider]:
    """FastAPI 依赖：注入对象存储 Provider。"""
    provider = build_storage_provider()
    try:
        yield provider
    finally:
        await provider.aclose()


# --------------------------------------------------------------------------- #
# 爬虫 Provider（命中验证）
# --------------------------------------------------------------------------- #
@runtime_checkable
class CrawlerProvider(Protocol):
    """爬虫 / 命中验证抽象接口。"""

    async def search(self, keyword: str, engine: str) -> list[SearchHit]: ...

    async def aclose(self) -> None: ...


async def get_crawler_provider() -> AsyncGenerator[CrawlerProvider]:
    """FastAPI 依赖：注入爬虫 Provider，请求结束后关闭连接。"""
    provider = build_crawler_provider()
    try:
        yield provider
    finally:
        await provider.aclose()
